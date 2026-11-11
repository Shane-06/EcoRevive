const config = require('../config');
const openMeteoProvider = require('../integrations/openMeteo.provider');
const soilGridsProvider = require('../integrations/soilGrids.provider');
const { BadRequestError } = require('../utils/errors');

const WEATHER_CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes
const SOIL_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const MAX_CACHE_ENTRIES = 500;

class EnvironmentService {
  constructor() {
    this.weatherCache = new Map(); // key -> { data, expiresAt, lastAccessed }
    this.soilCache = new Map(); // key -> { data, expiresAt, lastAccessed }
    this.regionalCache = new Map(); // key -> { data, expiresAt, lastAccessed }
    this.pendingWeather = new Map(); // key -> Promise<weather>
    this.pendingSoil = new Map(); // key -> Promise<soil>

    this.WEATHER_TTL_MS = WEATHER_CACHE_TTL_MS;
    this.SOIL_TTL_MS = SOIL_CACHE_TTL_MS;
  }

  /**
   * Normalizes coordinates to 2 decimal places for cache keys (~1.1 km grid).
   * @param {number} lat
   * @param {number} lng
   * @returns {string} Cache key e.g. "30.65:76.78"
   */
  normalizeCoords(lat, lng) {
    return `${Number(lat).toFixed(2)}:${Number(lng).toFixed(2)}`;
  }

  /**
   * Clears in-memory caches and pending request queues (used for testing).
   */
  clearCache() {
    this.weatherCache.clear();
    this.soilCache.clear();
    this.regionalCache.clear();
    this.pendingWeather.clear();
    this.pendingSoil.clear();
  }

  /**
   * Returns current statistics of the in-memory cache.
   * @returns {object}
   */
  getCacheStats() {
    return {
      weatherCacheSize: this.weatherCache.size,
      soilCacheSize: this.soilCache.size,
      regionalCacheSize: this.regionalCache.size,
      pendingWeatherSize: this.pendingWeather.size,
      pendingSoilSize: this.pendingSoil.size,
    };
  }

  /**
   * Enforces bounded cache size and prunes expired entries.
   * @private
   * @param {Map} cacheMap
   */
  _cleanupCache(cacheMap) {
    const now = Date.now();
    for (const [key, entry] of cacheMap.entries()) {
      if (now >= entry.expiresAt) {
        cacheMap.delete(key);
      }
    }

    while (cacheMap.size >= MAX_CACHE_ENTRIES) {
      let oldestKey = null;
      let oldestTime = Infinity;
      for (const [k, v] of cacheMap.entries()) {
        if (v.lastAccessed < oldestTime) {
          oldestTime = v.lastAccessed;
          oldestKey = k;
        }
      }
      if (oldestKey) {
        cacheMap.delete(oldestKey);
      } else {
        break;
      }
    }
  }

  /**
   * Stores a successful response in cache.
   * @private
   * @param {Map} cacheMap
   * @param {string} key
   * @param {object} data
   * @param {number} ttlMs
   */
  _setCache(cacheMap, key, data, ttlMs) {
    this._cleanupCache(cacheMap);
    cacheMap.set(key, {
      data,
      expiresAt: Date.now() + ttlMs,
      lastAccessed: Date.now(),
    });
  }

  /**
   * Retrieves weather for normalized coordinates with caching and promise deduplication.
   * @param {number} parsedLat
   * @param {number} parsedLng
   * @returns {Promise<object>}
   */
  async getWeather(parsedLat, parsedLng) {
    const key = this.normalizeCoords(parsedLat, parsedLng);
    const now = Date.now();

    const cached = this.weatherCache.get(key);
    if (cached && now < cached.expiresAt) {
      cached.lastAccessed = now;
      return JSON.parse(JSON.stringify(cached.data));
    }

    if (this.pendingWeather.has(key)) {
      return this.pendingWeather.get(key);
    }

    const fetchPromise = (async () => {
      try {
        const result = await openMeteoProvider.fetchWeather({ latitude: parsedLat, longitude: parsedLng });
        if (result && result.status === 'available') {
          this._setCache(this.weatherCache, key, result, this.WEATHER_TTL_MS);
        }
        return result;
      } finally {
        this.pendingWeather.delete(key);
      }
    })();

    this.pendingWeather.set(key, fetchPromise);
    return fetchPromise;
  }

  /**
   * Retrieves soil for normalized coordinates with caching and promise deduplication.
   * Only valid successful measurements are committed to cache (NoData/null responses are excluded).
   * @param {number} parsedLat
   * @param {number} parsedLng
   * @returns {Promise<object>}
   */
  async getSoil(parsedLat, parsedLng) {
    const key = this.normalizeCoords(parsedLat, parsedLng);
    const now = Date.now();

    const cached = this.soilCache.get(key);
    if (cached && now < cached.expiresAt) {
      cached.lastAccessed = now;
      return JSON.parse(JSON.stringify(cached.data));
    }

    if (this.pendingSoil.has(key)) {
      return this.pendingSoil.get(key);
    }

    const fetchPromise = (async () => {
      try {
        const result = await soilGridsProvider.fetchSoil({ latitude: parsedLat, longitude: parsedLng });
        // Commit to cache ONLY if valid measurements exist (never cache NoData or urban mask as available)
        const hasValidMeasurements =
          result &&
          result.status === 'available' &&
          result.data &&
          (result.data.ph !== null ||
            result.data.clayPercentage !== null ||
            result.data.sandPercentage !== null ||
            result.data.siltPercentage !== null ||
            result.data.organicCarbon !== null);

        if (hasValidMeasurements) {
          this._setCache(this.soilCache, key, result, this.SOIL_TTL_MS);
        }
        return result;
      } finally {
        this.pendingSoil.delete(key);
      }
    })();

    this.pendingSoil.set(key, fetchPromise);
    return fetchPromise;
  }

  /**
   * Calculates haversine distance between two coordinates in kilometers.
   * @private
   */
  _calculateDistanceKm(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's mean radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 10) / 10;
  }

  /**
   * Optional bounded regional sampling strategy when exact site soil data is unavailable (urban mask).
   * Evaluates up to four cardinal probes (North, East, South, West) at configurable distance.
   * Uses the first valid, geographically closest response.
   * Never stores regional data under the exact-site cache key.
   * @param {number} lat - Target latitude
   * @param {number} lng - Target longitude
   * @returns {Promise<object|null>}
   */
  async getRegionalSoilBaseline(lat, lng) {
    const regionalKey = `regional:${this.normalizeCoords(lat, lng)}`;
    const now = Date.now();

    const cachedRegional = this.regionalCache.get(regionalKey);
    if (cachedRegional && now < cachedRegional.expiresAt) {
      cachedRegional.lastAccessed = now;
      return JSON.parse(JSON.stringify(cachedRegional.data));
    }

    const distanceKm = config.providers.soilGrids.regionalDistanceKm || 10;
    const deltaLat = distanceKm / 111.0;
    const cosLat = Math.cos((lat * Math.PI) / 180);
    const deltaLng = Math.abs(cosLat) > 0.001 ? distanceKm / (111.32 * cosLat) : distanceKm / 111.32;

    const probes = [
      { direction: 'North', lat: lat + deltaLat, lng },
      { direction: 'East', lat, lng: lng + deltaLng },
      { direction: 'South', lat: lat - deltaLat, lng },
      { direction: 'West', lat, lng: lng - deltaLng },
    ];

    for (const probe of probes) {
      const probeLat = Math.max(-90, Math.min(90, probe.lat));
      const probeLng = Math.max(-180, Math.min(180, probe.lng));

      try {
        const probeResult = await this.getSoil(probeLat, probeLng);

        if (
          probeResult &&
          probeResult.status === 'available' &&
          probeResult.data &&
          (probeResult.data.ph !== null || probeResult.data.clayPercentage !== null)
        ) {
          const actualDist = this._calculateDistanceKm(lat, lng, probeLat, probeLng);
          const baselineResult = {
            status: 'regional_baseline',
            isRegional: true,
            source: 'ISRIC SoilGrids (Regional Baseline)',
            samplingMethod: 'cardinal_radial_probe',
            sampleLocation: {
              latitude: Math.round(probeLat * 10000) / 10000,
              longitude: Math.round(probeLng * 10000) / 10000,
            },
            distanceKm: actualDist,
            direction: probe.direction,
            warning: `Regional soil baseline derived from nearby non-urban profile (${actualDist} km ${probe.direction} of site). Not an exact-site measurement; urban soil conditions may differ.`,
            verifiedAt: new Date().toISOString(),
            stale: false,
            data: probeResult.data,
          };

          // Cache in regional cache (NEVER under the exact-site cache key)
          this._setCache(this.regionalCache, regionalKey, baselineResult, this.SOIL_TTL_MS);
          return baselineResult;
        }
      } catch {
        // Continue to next probe on probe failure
      }
    }

    return null;
  }

  /**
   * Retrieves environmental conditions for a specific location.
   * Concurrently queries Open-Meteo and ISRIC SoilGrids with deduplication and caching.
   * If exact-site soil data is unavailable (urban mask), optionally queries regional baseline.
   * @param {object} params
   * @param {number|string} params.lat - Latitude coordinate
   * @param {number|string} params.lng - Longitude coordinate
   * @param {boolean} [params.enableRegionalBaseline=true] - Whether to attempt regional probe on urban NoData
   * @returns {Promise<object>} Normalized environmental assessment data
   */
  async getLocationEnvironment({ lat, lng, enableRegionalBaseline = true }) {
    if (lat === undefined || lat === null || lat === '') {
      throw new BadRequestError('Latitude (lat) is required', 'MISSING_COORDINATES');
    }
    if (lng === undefined || lng === null || lng === '') {
      throw new BadRequestError('Longitude (lng) is required', 'MISSING_COORDINATES');
    }

    const parsedLat = typeof lat === 'number' ? lat : parseFloat(lat);
    const parsedLng = typeof lng === 'number' ? lng : parseFloat(lng);

    if (isNaN(parsedLat) || !isFinite(parsedLat) || parsedLat < -90 || parsedLat > 90) {
      throw new BadRequestError(
        'Latitude must be a valid number between -90 and 90',
        'INVALID_COORDINATES'
      );
    }
    if (isNaN(parsedLng) || !isFinite(parsedLng) || parsedLng < -180 || parsedLng > 180) {
      throw new BadRequestError(
        'Longitude must be a valid number between -180 and 180',
        'INVALID_COORDINATES'
      );
    }

    // Execute provider lookups concurrently with deduplication and caching
    const [weather, exactSoil] = await Promise.all([
      this.getWeather(parsedLat, parsedLng),
      this.getSoil(parsedLat, parsedLng),
    ]);

    let soil = exactSoil;

    // Optional regional baseline fallback when exact-site soil is unavailable (urban mask)
    if (
      soil &&
      soil.status === 'unavailable' &&
      soil.reason === 'urban_mask' &&
      config.providers.soilGrids.enableRegionalBaseline !== false &&
      enableRegionalBaseline !== false
    ) {
      const regional = await this.getRegionalSoilBaseline(parsedLat, parsedLng);
      if (regional) {
        soil = regional;
      }
    }

    return {
      location: {
        latitude: parsedLat,
        longitude: parsedLng,
      },
      weather,
      soil,
      terrain: {
        status: 'unavailable',
        source: null,
        verifiedAt: null,
        data: null,
      },
      land: {
        status: 'unavailable',
        source: null,
        verifiedAt: null,
        data: null,
      },
      water: {
        status: 'unavailable',
        source: null,
        verifiedAt: null,
        data: null,
      },
    };
  }
}

module.exports = new EnvironmentService();
