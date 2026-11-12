'use strict';

const config = require('../config');
const defaultCacheRepo = require('../repositories/environmentCache.repository');

const USER_AGENT = 'EcoRevive-UrbanPlantation/1.0 (+https://ecorevive.org; contact@ecorevive.org)';
const DEFAULT_COOLDOWN_SECONDS = 60;
const MAX_STALE_ENTRIES = 500;

/**
 * Maps WMO Weather interpretation codes to human-readable descriptions.
 * @param {number} code - WMO weather code
 * @returns {string} Weather description
 */
const getWeatherConditionDescription = (code) => {
  if (code === 0) return 'Clear sky';
  if (code === 1) return 'Mainly clear';
  if (code === 2) return 'Partly cloudy';
  if (code === 3) return 'Overcast';
  if (code === 45 || code === 48) return 'Fog';
  if (code >= 51 && code <= 55) return 'Drizzle';
  if (code >= 61 && code <= 65) return 'Rain';
  if (code >= 71 && code <= 75) return 'Snow';
  if (code >= 80 && code <= 82) return 'Rain showers';
  if (code >= 95) return 'Thunderstorm';
  return 'Variable';
};

class OpenMeteoProvider {
  constructor(deps = {}) {
    this.baseUrl = deps.baseUrl || config.providers.openMeteo.baseUrl;
    this.timeoutMs = deps.timeoutMs || config.providers.openMeteo.timeoutMs;
    this.cacheRepo = deps.cacheRepo || defaultCacheRepo;
    this.cooldownUntil = 0;
    this.initialized = false;
    this.initPromise = null;
    this.instanceId = `om_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    this.staleWeatherMap = new Map();
  }

  /**
   * Loads persisted cooldown state from PostgreSQL on startup before outbound calls.
   * If DB query fails, retains in-memory cooldown state.
   * Coalesces concurrent calls on startup into a single initialization promise.
   */
  async ensureInitialized() {
    if (this.initialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      try {
        if (this.cacheRepo && typeof this.cacheRepo.getProviderCooldown === 'function') {
          const cd = await this.cacheRepo.getProviderCooldown('open-meteo');
          if (cd && cd.cooldownUntil) {
            const dbUntil = cd.cooldownUntil.getTime();
            if (dbUntil > this.cooldownUntil) {
              this.cooldownUntil = dbUntil;
            }
          }
        }
      } catch (err) {
        console.error('[OpenMeteoProvider] Failed to load persistent cooldown:', err.message);
      } finally {
        this.initialized = true;
        this.initPromise = null;
      }
    })();

    return this.initPromise;
  }

  /**
   * Normalizes coordinates to 2 decimal places for weather caching (~1.1 km grid).
   * @param {number} lat
   * @param {number} lng
   * @returns {string}
   */
  normalizeCoords(lat, lng) {
    return `${Number(lat).toFixed(2)}:${Number(lng).toFixed(2)}`;
  }

  /**
   * Clears active rate-limit cooldown (used for testing).
   */
  resetCooldown() {
    this.cooldownUntil = 0;
    this.initialized = true;
  }

  /**
   * Sets manual cooldown for testing.
   * @param {number} ms
   */
  setCooldown(ms) {
    this.cooldownUntil = Date.now() + ms;
    this.initialized = true;
  }

  /**
   * Clears in-memory stale weather cache (used for testing).
   */
  clearStaleCache() {
    this.staleWeatherMap.clear();
  }

  /**
   * Returns current cooldown expiration timestamp.
   * @returns {number}
   */
  getCooldownUntil() {
    return this.cooldownUntil;
  }

  /**
   * Stores successful weather result in in-memory stale cache with bounded size.
   * @param {string} key
   * @param {object} data
   */
  saveStale(key, data) {
    if (this.staleWeatherMap.size >= MAX_STALE_ENTRIES) {
      const firstKey = this.staleWeatherMap.keys().next().value;
      if (firstKey) this.staleWeatherMap.delete(firstKey);
    }
    this.staleWeatherMap.set(key, data);
  }

  /**
   * Parses the Retry-After header safely, returning bounded seconds (1s to 86400s).
   * @param {Headers|object} headers
   * @returns {number}
   */
  parseRetryAfter(headers) {
    if (!headers || typeof headers.get !== 'function') {
      return DEFAULT_COOLDOWN_SECONDS;
    }
    const val = headers.get('retry-after');
    if (!val) return DEFAULT_COOLDOWN_SECONDS;

    const seconds = parseInt(val, 10);
    if (!isNaN(seconds) && seconds > 0) {
      return Math.max(1, Math.min(86400, seconds));
    }

    const dateMs = Date.parse(val);
    if (!isNaN(dateMs) && dateMs > Date.now()) {
      const diffSecs = Math.ceil((dateMs - Date.now()) / 1000);
      return Math.max(1, Math.min(86400, diffSecs));
    }

    return DEFAULT_COOLDOWN_SECONDS;
  }

  /**
   * Fetches weather information for given coordinates from Open-Meteo.
   * @param {object} coords
   * @param {number} coords.latitude - Latitude coordinate
   * @param {number} coords.longitude - Longitude coordinate
   * @returns {Promise<object>} Normalized weather section
   */
  async fetchWeather({ latitude, longitude }) {
    await this.ensureInitialized();

    const key = this.normalizeCoords(latitude, longitude);
    const now = Date.now();

    // 1. Prevent outbound calls during active HTTP 429 cooldown (in-memory fast path)
    if (now < this.cooldownUntil) {
      const remainingSecs = Math.ceil((this.cooldownUntil - now) / 1000);
      const stale = this.staleWeatherMap.get(key);
      if (stale) {
        return {
          ...stale,
          stale: true,
          warning: `Open-Meteo rate limit active (HTTP 429 cooldown). Serving cached weather data (${remainingSecs}s remaining).`,
        };
      }

      return {
        status: 'unavailable',
        source: 'Open-Meteo',
        verifiedAt: null,
        data: null,
        isRateLimited: true,
        remainingCooldownSeconds: remainingSecs,
        error: `Open-Meteo rate limit active (HTTP 429 cooldown). Retry after ${remainingSecs}s`,
      };
    }

    // 2. Cross-instance atomic permit & persistent cooldown check
    let permit = null;
    if (this.cacheRepo && typeof this.cacheRepo.acquireOutboundPermit === 'function') {
      permit = await this.cacheRepo.acquireOutboundPermit(
        'open-meteo',
        Math.ceil(this.timeoutMs / 1000) + 2,
        this.instanceId
      );

      if (permit.inCooldown) {
        if (permit.cooldownUntil) {
          this.cooldownUntil = Math.max(this.cooldownUntil, permit.cooldownUntil.getTime());
        }
        const remainingSecs =
          permit.retryAfterSeconds || Math.max(1, Math.ceil((this.cooldownUntil - Date.now()) / 1000));
        const stale = this.staleWeatherMap.get(key);
        if (stale) {
          return {
            ...stale,
            stale: true,
            warning: `Open-Meteo rate limit active (HTTP 429 cooldown). Serving cached weather data (${remainingSecs}s remaining).`,
          };
        }

        return {
          status: 'unavailable',
          source: 'Open-Meteo',
          verifiedAt: null,
          data: null,
          isRateLimited: true,
          remainingCooldownSeconds: remainingSecs,
          error: `Open-Meteo rate limit active (HTTP 429 cooldown). Retry after ${remainingSecs}s`,
        };
      }

      if (!permit.granted) {
        // Another instance is currently executing an outbound call. Check if stale is available.
        const stale = this.staleWeatherMap.get(key);
        if (stale) {
          return {
            ...stale,
            stale: true,
            warning: 'Concurrent backend request in-flight. Serving cached weather data.',
          };
        }
      }
    }

    try {
      const url = new URL(this.baseUrl);
      url.searchParams.set('latitude', latitude.toString());
      url.searchParams.set('longitude', longitude.toString());
      url.searchParams.set(
        'current',
        'temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m'
      );
      url.searchParams.set(
        'daily',
        'temperature_2m_max,temperature_2m_min,precipitation_sum'
      );
      url.searchParams.set('timezone', 'auto');

      const response = await fetch(url.toString(), {
        headers: {
          'User-Agent': USER_AGENT,
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(this.timeoutMs),
      });

      if (!response.ok) {
        // Handle HTTP 429 Rate Limit
        if (response.status === 429) {
          const cooldownSecs = this.parseRetryAfter(response.headers);
          this.cooldownUntil = Date.now() + cooldownSecs * 1000;

          // Persist cooldown state across restarts (retaining in-memory on DB error)
          try {
            if (this.cacheRepo && typeof this.cacheRepo.setProviderCooldown === 'function') {
              await this.cacheRepo.setProviderCooldown(
                'open-meteo',
                cooldownSecs,
                'Open-Meteo HTTP 429 rate limit exceeded'
              );
            }
          } catch (persistErr) {
            console.error('[OpenMeteoProvider] Failed to persist cooldown:', persistErr.message);
          }

          const stale = this.staleWeatherMap.get(key);
          if (stale) {
            return {
              ...stale,
              stale: true,
              warning: `Provider responded with status 429 (Rate limit exceeded). Serving cached weather data (${cooldownSecs}s cooldown active).`,
            };
          }

          return {
            status: 'unavailable',
            source: 'Open-Meteo',
            verifiedAt: null,
            data: null,
            isRateLimited: true,
            remainingCooldownSeconds: cooldownSecs,
            error: `Provider responded with status 429 (Rate limit exceeded). ${cooldownSecs}s cooldown active.`,
          };
        }

        // Other HTTP non-200 errors
        const stale = this.staleWeatherMap.get(key);
        if (stale) {
          return {
            ...stale,
            stale: true,
            warning: `Provider responded with status ${response.status}. Serving cached weather data.`,
          };
        }

        return {
          status: 'unavailable',
          source: 'Open-Meteo',
          verifiedAt: null,
          data: null,
          error: `Provider responded with status ${response.status}`,
        };
      }

      const json = await response.json();
      const current = json.current || {};
      const daily = json.daily || {};

      const result = {
        status: 'available',
        source: 'Open-Meteo',
        verifiedAt: new Date().toISOString(),
        stale: false,
        data: {
          temperature: current.temperature_2m !== undefined ? current.temperature_2m : null,
          temperatureUnit: '°C',
          humidity: current.relative_humidity_2m !== undefined ? current.relative_humidity_2m : null,
          humidityUnit: '%',
          precipitation: current.precipitation !== undefined ? current.precipitation : null,
          precipitationUnit: 'mm',
          windSpeed: current.wind_speed_10m !== undefined ? current.wind_speed_10m : null,
          windSpeedUnit: 'km/h',
          weatherCode: current.weather_code !== undefined ? current.weather_code : null,
          condition:
            current.weather_code !== undefined
              ? getWeatherConditionDescription(current.weather_code)
              : 'Unknown',
          forecast: {
            maxTemp:
              Array.isArray(daily.temperature_2m_max) && daily.temperature_2m_max.length > 0
                ? daily.temperature_2m_max[0]
                : null,
            minTemp:
              Array.isArray(daily.temperature_2m_min) && daily.temperature_2m_min.length > 0
                ? daily.temperature_2m_min[0]
                : null,
            precipitationSum:
              Array.isArray(daily.precipitation_sum) && daily.precipitation_sum.length > 0
                ? daily.precipitation_sum[0]
                : null,
          },
        },
      };

      // Save to in-memory stale cache
      this.saveStale(key, result);

      return result;
    } catch (err) {
      const stale = this.staleWeatherMap.get(key);
      if (stale) {
        return {
          ...stale,
          stale: true,
          warning: `Provider connection error (${err.message}). Serving cached weather data.`,
        };
      }

      return {
        status: 'unavailable',
        source: 'Open-Meteo',
        verifiedAt: null,
        data: null,
        error: err.name === 'TimeoutError' ? 'Provider request timed out' : 'Provider connection failed',
      };
    } finally {
      if (permit && permit.granted && permit.permitHolder && typeof this.cacheRepo?.releaseOutboundPermit === 'function') {
        try {
          await this.cacheRepo.releaseOutboundPermit('open-meteo', permit.permitHolder);
        } catch {
          // Non-critical cleanup
        }
      }
    }
  }
}

const openMeteoProvider = new OpenMeteoProvider();
openMeteoProvider.OpenMeteoProvider = OpenMeteoProvider;
openMeteoProvider.getWeatherConditionDescription = getWeatherConditionDescription;

module.exports = openMeteoProvider;
