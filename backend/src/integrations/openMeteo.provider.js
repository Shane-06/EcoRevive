const config = require('../config');

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
  constructor() {
    this.baseUrl = config.providers.openMeteo.baseUrl;
    this.timeoutMs = config.providers.openMeteo.timeoutMs;
    this.cooldownUntil = 0;
    this.staleWeatherMap = new Map();
  }

  /**
   * Normalizes coordinates to 2 decimal places for caching (~1.1 km resolution).
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
  }

  /**
   * Sets manual cooldown for testing.
   * @param {number} ms
   */
  setCooldown(ms) {
    this.cooldownUntil = Date.now() + ms;
  }

  /**
   * Clears stale weather cache (used for testing).
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
   * Stores successful weather result in stale cache with bounded size.
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
   * Parses the Retry-After header if present, returning seconds.
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
      return seconds;
    }

    const dateMs = Date.parse(val);
    if (!isNaN(dateMs) && dateMs > Date.now()) {
      return Math.ceil((dateMs - Date.now()) / 1000);
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
    const key = this.normalizeCoords(latitude, longitude);
    const now = Date.now();

    // 1. Prevent requests during active HTTP 429 cooldown
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
        error: `Open-Meteo rate limit active (HTTP 429 cooldown). Retry after ${remainingSecs}s`,
      };
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

      // Save to stale cache
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
    }
  }
}

module.exports = new OpenMeteoProvider();
