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
        if (result && result.status === 'available') {
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
   * Retrieves environmental conditions for a specific location.
   * Concurrently queries Open-Meteo and ISRIC SoilGrids with deduplication and caching.
   * @param {object} params
   * @param {number|string} params.lat - Latitude coordinate
   * @param {number|string} params.lng - Longitude coordinate
   * @returns {Promise<object>} Normalized environmental assessment data
   */
  async getLocationEnvironment({ lat, lng }) {
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
    const [weather, soil] = await Promise.all([
      this.getWeather(parsedLat, parsedLng),
      this.getSoil(parsedLat, parsedLng),
    ]);

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
