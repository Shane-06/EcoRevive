'use strict';

const config = require('../config');
const defaultOpenMeteo = require('../integrations/openMeteo.provider');
const defaultSoilGrids = require('../integrations/soilGrids.provider');
const defaultCacheRepo = require('../repositories/environmentCache.repository');
const { BadRequestError } = require('../utils/errors');

const MAX_CACHE_ENTRIES = 500;

class EnvironmentService {
  constructor(deps = {}) {
    this.openMeteoProvider = deps.openMeteoProvider || defaultOpenMeteo;
    this.soilGridsProvider = deps.soilGridsProvider || defaultSoilGrids;
    this.cacheRepo = deps.cacheRepo || defaultCacheRepo;

    this.weatherCache = new Map(); // key -> { data, expiresAt, lastAccessed }
    this.weatherFailures = new Map();
    this.soilCache = new Map(); // key -> { data, expiresAt, lastAccessed }
    this.regionalCache = new Map(); // key -> { data, expiresAt, lastAccessed }
    this.pendingWeather = new Map(); // key -> Promise<weather>
    this.pendingSoil = new Map(); // key -> Promise<soil>
    this.pendingRegional = new Map();
    this.soilFailures = new Map(); // short negative cache, never represented as measurements

    this.WEATHER_FRESH_TTL_MS = config.providers.openMeteo.freshTtlMs || 30 * 60 * 1000; // 30 minutes
    this.WEATHER_MAX_STALE_MS = config.providers.openMeteo.maxStaleMs || 24 * 60 * 60 * 1000; // 24 hours
    this.SOIL_TTL_MS = config.providers.soilGrids.ttlMs || 90 * 24 * 60 * 60 * 1000; // 90 days
  }

  /**
   * Normalizes coordinates to 2 decimal places for weather and backwards compatibility.
   * @param {number} lat
   * @param {number} lng
   * @returns {string} Cache key e.g. "30.65:76.78"
   */
  normalizeCoords(lat, lng) {
    return `${Number(lat).toFixed(2)}:${Number(lng).toFixed(2)}`;
  }

  /**
   * Normalizes weather coordinates to 2 decimal places for regional atmospheric caching (~1.1 km grid).
   * @param {number} lat
   * @param {number} lng
   * @returns {string} Weather cache key e.g. "30.65:76.78"
   */
  normalizeWeatherCoords(lat, lng) {
    return this.normalizeCoords(lat, lng);
  }

  /**
   * Computes an approximate localized WGS84 spatial grid bucket (~250m nominal resolution).
   * Note: This is an approximate spatial bucket for caching, not an exact Goode Homolosine raster cell.
   * @param {number} lat
   * @param {number} lng
   * @returns {{cellKey: string, cellIndexLat: number, cellIndexLng: number, snappedLat: number, snappedLng: number, isExactRasterCell: false, spatialMethod: string, nominalResolution: string}}
   */
  computeSoilRasterCell(lat, lng) {
    if (this.soilGridsProvider && typeof this.soilGridsProvider.computeApproxSpatialCell === 'function') {
      return this.soilGridsProvider.computeApproxSpatialCell(lat, lng);
    }
    if (this.soilGridsProvider && typeof this.soilGridsProvider.compute250mRasterCell === 'function') {
      return this.soilGridsProvider.compute250mRasterCell(lat, lng);
    }
    const deltaLat = 250.0 / 110574.0;
    const cosLat = Math.cos((Number(lat) * Math.PI) / 180.0);
    const deltaLng = Math.abs(cosLat) > 0.001 ? 250.0 / (111320.0 * Math.abs(cosLat)) : deltaLat;
    const cellIndexLat = Math.floor(Number(lat) / deltaLat);
    const cellIndexLng = Math.floor(Number(lng) / deltaLng);
    return {
      cellKey: `c${cellIndexLat}:${cellIndexLng}`,
      cellIndexLat,
      cellIndexLng,
      snappedLat: Number(((cellIndexLat + 0.5) * deltaLat).toFixed(5)),
      snappedLng: Number(((cellIndexLng + 0.5) * deltaLng).toFixed(5)),
      isExactRasterCell: false,
      spatialMethod: 'approximate_wgs84_grid_bucket',
      nominalResolution: '~250m (localized WGS84 approximation)',
    };
  }

  /**
   * Clears in-memory caches and pending request queues (used for testing).
   */
  clearCache() {
    this.weatherCache.clear();
    this.weatherFailures.clear();
    this.soilCache.clear();
    this.regionalCache.clear();
    this.pendingWeather.clear();
    this.pendingSoil.clear();
    this.pendingRegional.clear();
    this.soilFailures.clear();
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
   * Enforces bounded in-memory cache size and prunes expired entries.
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
   * Stores an entry in the in-memory L1 cache.
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
   * Retrieves atmospheric weather for coordinates using L1 memory, persistent L2 database,
   * live Open-Meteo querying, and bounded 24-hour stale fallback.
   * In-flight promise deduplication wraps the entire retrieval to prevent race conditions.
   * @param {number} parsedLat
   * @param {number} parsedLng
   * @param {object} [options={}]
   * @param {number} [options.timeoutMs]
   * @param {AbortSignal} [options.signal]
   * @returns {Promise<object>}
   */
  async getWeather(parsedLat, parsedLng, options = {}) {
    const key = this.normalizeWeatherCoords(parsedLat, parsedLng);
    const now = Date.now();

    // 1. Tier 1: In-memory L1 cache (Hot path)
    const cached = this.weatherCache.get(key);
    if (cached && now < cached.expiresAt) {
      cached.lastAccessed = now;
      return JSON.parse(JSON.stringify(cached.data));
    }

    // 2. Deduplication: in-flight request coalescing MUST happen before async L2 or provider calls!
    if (this.pendingWeather.has(key)) {
      return this.pendingWeather.get(key);
    }
    const recentFailure = this.weatherFailures.get(key);
    if (recentFailure && now < recentFailure.expiresAt) return recentFailure.data;

    const fetchPromise = (async () => {
      try {
        // Tier 2: Persistent L2 database cache lookup
        let dbStaleCandidate = null;
        try {
          if (this.cacheRepo && typeof this.cacheRepo.findByGridAndType === 'function') {
            const dbRow = await this.cacheRepo.findByGridAndType(key, 'weather');
            if (dbRow && dbRow.data) {
              const verifiedAtMs = new Date(dbRow.verified_at).getTime();
              const expiresAtMs = new Date(dbRow.expires_at).getTime();
              const ageMs = now - verifiedAtMs;

              if (now < expiresAtMs) {
                const freshResult = {
                  status: dbRow.status || 'available',
                  source: dbRow.source || 'Open-Meteo',
                  verifiedAt: new Date(dbRow.verified_at).toISOString(),
                  stale: false,
                  data: dbRow.data,
                  metadata: dbRow.metadata || {},
                };
                this._setCache(this.weatherCache, key, freshResult, expiresAtMs - now);
                return freshResult;
              }

              if (ageMs <= this.WEATHER_MAX_STALE_MS) {
                dbStaleCandidate = dbRow;
              }
            }
          }
        } catch (dbErr) {
          console.error('[EnvironmentService] L2 weather cache lookup error:', dbErr.message);
        }

        // Check if provider is currently in cooldown (persisted across restarts)
        await this.openMeteoProvider.ensureInitialized?.();
        const cooldownUntil = this.openMeteoProvider.getCooldownUntil?.() || 0;
        const inCooldown = Date.now() < cooldownUntil;

        if (inCooldown) {
          const remainingSecs = Math.ceil((cooldownUntil - Date.now()) / 1000);

          // Serve persistent stale fallback if within 24h limit
          if (dbStaleCandidate) {
            const verifiedAtMs = new Date(dbStaleCandidate.verified_at).getTime();
            const staleAgeSeconds = Math.max(0, Math.floor((Date.now() - verifiedAtMs) / 1000));
            const staleAgeHours = Math.round((staleAgeSeconds / 3600) * 10) / 10;
            return {
              status: 'available',
              source: dbStaleCandidate.source || 'Open-Meteo',
              verifiedAt: new Date(dbStaleCandidate.verified_at).toISOString(),
              stale: true,
              staleAgeSeconds,
              staleAgeHours,
              warning: `Open-Meteo rate limit active (HTTP 429). Serving cached weather from ${new Date(dbStaleCandidate.verified_at).toLocaleTimeString()} (${staleAgeHours}h ago).`,
              data: dbStaleCandidate.data,
              metadata: dbStaleCandidate.metadata || {},
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

        // Provider is not in cooldown -> dispatch live request
        const result = await this.openMeteoProvider.fetchWeather({
          latitude: parsedLat,
          longitude: parsedLng,
          timeoutMs: options.timeoutMs,
          signal: options.signal,
        });

        if (result && result.status === 'available' && !result.stale) {
          // Commit to L1 cache
          this._setCache(this.weatherCache, key, result, this.WEATHER_FRESH_TTL_MS);

          // Persist to L2 database cache
          try {
            if (this.cacheRepo && typeof this.cacheRepo.upsertCache === 'function') {
              await this.cacheRepo.upsertCache({
                gridKey: key,
                cacheType: 'weather',
                latitude: parsedLat,
                longitude: parsedLng,
                source: result.source || 'Open-Meteo',
                status: 'available',
                data: result.data,
                metadata: result.metadata || {},
                verifiedAt: result.verifiedAt || new Date().toISOString(),
                expiresAt: new Date(Date.now() + this.WEATHER_FRESH_TTL_MS),
              });
            }
          } catch (upsertErr) {
            console.error('[EnvironmentService] Failed to upsert weather to L2 cache:', upsertErr.message);
          }
          return result;
        }

        // Live request failed (429 or network) -> fallback to L2 stale candidate if within 24h
        if (dbStaleCandidate) {
          const verifiedAtMs = new Date(dbStaleCandidate.verified_at).getTime();
          const staleAgeSeconds = Math.max(0, Math.floor((Date.now() - verifiedAtMs) / 1000));
          const staleAgeHours = Math.round((staleAgeSeconds / 3600) * 10) / 10;
          return {
            status: 'available',
            source: dbStaleCandidate.source || 'Open-Meteo',
            verifiedAt: new Date(dbStaleCandidate.verified_at).toISOString(),
            stale: true,
            staleAgeSeconds,
            staleAgeHours,
            warning: `Live weather provider unavailable. Serving cached weather from ${new Date(dbStaleCandidate.verified_at).toLocaleTimeString()} (${staleAgeHours}h ago).`,
            data: dbStaleCandidate.data,
            metadata: dbStaleCandidate.metadata || {},
          };
        }

        if (result?.status === 'unavailable') this._setCache(this.weatherFailures, key, result, 10000);
        return result;
      } finally {
        this.pendingWeather.delete(key);
      }
    })();

    this.pendingWeather.set(key, fetchPromise);
    return fetchPromise;
  }

  /**
   * Retrieves soil properties using nominal ~250m geographic cache buckets.
   * Caches exact-site measurements in L1 and L2 persistent storage (90-day TTL).
   * In-flight promise deduplication wraps the entire retrieval to prevent race conditions.
   * @param {number} parsedLat
   * @param {number} parsedLng
   * @returns {Promise<object>}
   */
  /**
   * Formats a stale L2 database soil record as a safe fallback payload.
   * Preserves original observation coordinates, snaphots, and clear provenance metadata.
   * @private
   */
  _formatStaleSoil(dbRow, parsedLat, parsedLng, cellKey, snappedLat, snappedLng, customWarning = '') {
    const obsLat = Number(dbRow.latitude);
    const obsLng = Number(dbRow.longitude);
    const distKm = this._calculateDistanceKm(parsedLat, parsedLng, obsLat, obsLng);
    const distMeters = Math.round(distKm * 1000);
    const isNearbyObservation = distMeters > 15;
    const verifiedAtMs = new Date(dbRow.verified_at).getTime();
    const staleAgeSeconds = Math.max(0, Math.floor((Date.now() - verifiedAtMs) / 1000));
    const staleAgeDays = Math.round((staleAgeSeconds / 86400) * 10) / 10;

    const defaultWarning = `Live soil provider unavailable. Serving cached soil properties from ${new Date(dbRow.verified_at).toLocaleDateString()} (${staleAgeDays}d ago).`;

    return {
      status: 'available',
      source: dbRow.source || 'ISRIC SoilGrids',
      verifiedAt: new Date(dbRow.verified_at).toISOString(),
      stale: true,
      staleAgeSeconds,
      staleAgeDays,
      warning: customWarning || defaultWarning,
      data: dbRow.data,
      metadata: {
        ...(dbRow.metadata || {}),
        spatialPrecision: isNearbyObservation ? 'approximate_grid_bucket' : 'same_query_location',
        isExactRasterCell: false,
        isExactSiteMeasurement: false,
        spatialMethod: 'approximate_wgs84_grid_bucket',
        nominalResolution: '~250m (localized WGS84 approximation)',
        cellKey,
        gridCenter: { latitude: snappedLat, longitude: snappedLng },
        targetLocation: { latitude: parsedLat, longitude: parsedLng },
        sourceLocation: { latitude: obsLat, longitude: obsLng },
        distanceFromObservedMeters: distMeters,
        fromPersistentCache: true,
        staleFallback: true,
        scientificDisclaimer: 'Modeled ~250m raster estimation; does not represent an in-situ physical core sample.',
      },
    };
  }

  /**
   * Formats a stale L2 database regional soil record as a safe fallback payload.
   * Preserves sampling direction, distance, and provenance metadata.
   * @private
   */
  _formatStaleRegionalSoil(dbRow, lat, lng, distanceKm, remainingSecs = 0) {
    const meta = dbRow.metadata || {};
    const verifiedAtMs = new Date(dbRow.verified_at).getTime();
    const staleAgeSeconds = Math.max(0, Math.floor((Date.now() - verifiedAtMs) / 1000));
    const staleAgeDays = Math.round((staleAgeSeconds / 86400) * 10) / 10;
    const distKm = meta.distanceKm || distanceKm;
    const direction = meta.direction || 'nearby';

    return {
      status: 'regional_baseline',
      isRegional: true,
      source: dbRow.source || 'ISRIC SoilGrids (Regional Baseline)',
      samplingMethod: meta.samplingMethod || 'cardinal_radial_probe',
      sampleLocation: meta.sampleLocation || null,
      targetLocation: meta.targetLocation || {
        latitude: Math.round(lat * 10000) / 10000,
        longitude: Math.round(lng * 10000) / 10000,
      },
      distanceKm: distKm,
      direction: meta.direction || 'Unknown',
      spatialPrecision: 'regional_baseline',
      isExactRasterCell: false,
      isExactSiteMeasurement: false,
      stale: true,
      staleAgeSeconds,
      staleAgeDays,
      warning: remainingSecs > 0
        ? `SoilGrids provider in cooldown (${remainingSecs}s remaining). Serving cached regional soil baseline (${distKm} km ${direction} of site, ${staleAgeDays}d ago).`
        : `Live soil provider unavailable. Serving cached regional soil baseline (${distKm} km ${direction} of site, ${staleAgeDays}d ago).`,
      verifiedAt: new Date(dbRow.verified_at).toISOString(),
      data: dbRow.data,
    };
  }

  /**
   * Retrieves soil properties using actual SoilGrids 250m raster cell identity.
   * Caches exact-site measurements in L1 and L2 persistent storage (90-day TTL).
   * In-flight promise deduplication wraps the entire retrieval to prevent race conditions.
   * Supports persistent failure cooldown and stale L2 fallback during upstream outages.
   * @param {number} parsedLat
   * @param {number} parsedLng
   * @param {object} [options={}]
   * @param {number} [options.timeoutMs]
   * @param {AbortSignal} [options.signal]
   * @param {string} [options.parentPermitHolder]
   * @returns {Promise<object>}
   */
  async getSoil(parsedLat, parsedLng, options = {}) {
    const { cellKey, snappedLat, snappedLng } = this.computeSoilRasterCell(parsedLat, parsedLng);
    const exactSoilKey = `soil_exact:${cellKey}`;
    const now = Date.now();

    // 1. Tier 1: In-memory L1 cache
    const cached = this.soilCache.get(exactSoilKey);
    if (cached && now < cached.expiresAt) {
      cached.lastAccessed = now;
      return this._soilForTarget(JSON.parse(JSON.stringify(cached.data)), parsedLat, parsedLng);
    }

    // 2. Deduplication: in-flight request coalescing
    if (this.pendingSoil.has(exactSoilKey)) {
      return this._soilForTarget(await this.pendingSoil.get(exactSoilKey), parsedLat, parsedLng);
    }

    const failure = this.soilFailures.get(exactSoilKey);
    if (failure && now < failure.expiresAt) return failure.data;

    const fetchPromise = (async () => {
      try {
        let dbStaleCandidate = null;

        // Tier 2: Persistent L2 database cache lookup
        try {
          if (this.cacheRepo && typeof this.cacheRepo.findByGridAndType === 'function') {
            const dbRow = await this.cacheRepo.findByGridAndType(cellKey, 'soil_exact');
            if (dbRow && dbRow.data) {
              const expiresAtMs = new Date(dbRow.expires_at).getTime();
              if (now < expiresAtMs) {
                const obsLat = Number(dbRow.latitude);
                const obsLng = Number(dbRow.longitude);
                const distKm = this._calculateDistanceKm(parsedLat, parsedLng, obsLat, obsLng);
                const distMeters = Math.round(distKm * 1000);
                const isNearbyObservation = distMeters > 15; // Beyond GPS precision threshold

                const freshResult = {
                  status: dbRow.status || 'available',
                  source: dbRow.source || 'ISRIC SoilGrids',
                  verifiedAt: new Date(dbRow.verified_at).toISOString(),
                  stale: false,
                  data: dbRow.data,
                  metadata: {
                    ...(dbRow.metadata || {}),
                    spatialPrecision: isNearbyObservation ? 'approximate_grid_bucket' : 'same_query_location',
                    isExactRasterCell: false,
                    isExactSiteMeasurement: false,
                    spatialMethod: 'approximate_wgs84_grid_bucket',
                    nominalResolution: '~250m (localized WGS84 approximation)',
                    cellKey,
                    gridCenter: { latitude: snappedLat, longitude: snappedLng },
                    targetLocation: { latitude: parsedLat, longitude: parsedLng },
                    sourceLocation: { latitude: obsLat, longitude: obsLng },
                    distanceFromObservedMeters: distMeters,
                    fromPersistentCache: true,
                    scientificDisclaimer: 'Modeled ~250m raster estimation; does not represent an in-situ physical core sample.',
                  },
                };
                if (isNearbyObservation) {
                  freshResult.warning = `Soil properties retrieved from cached observation within the same nominal ~250m spatial grid (~${distMeters}m from requested coordinates). Not an exact-site measurement of the specific point.`;
                }
                this._setCache(this.soilCache, exactSoilKey, freshResult, expiresAtMs - now);
                return freshResult;
              } else {
                // Hold onto expired L2 record as a candidate for stale fallback
                dbStaleCandidate = dbRow;
              }
            }
          }
        } catch (dbErr) {
          console.error('[EnvironmentService] L2 soil cache lookup error:', dbErr.message);
        }

        // Check if SoilGrids provider is currently in cooldown (persisted across restarts)
        try {
          if (this.cacheRepo && typeof this.cacheRepo.getProviderCooldown === 'function') {
            const activeCooldown = await this.cacheRepo.getProviderCooldown('soilgrids');
            if (activeCooldown && activeCooldown.cooldownUntil && activeCooldown.cooldownUntil.getTime() > now) {
              const remainingSecs = Math.max(1, Math.ceil((activeCooldown.cooldownUntil.getTime() - now) / 1000));

              // If stale L2 record exists, serve it immediately with warning
              if (dbStaleCandidate) {
                return this._formatStaleSoil(
                  dbStaleCandidate,
                  parsedLat,
                  parsedLng,
                  cellKey,
                  snappedLat,
                  snappedLng,
                  `SoilGrids provider in cooldown (${remainingSecs}s remaining). Serving cached soil properties.`
                );
              }

              // Otherwise return structured unavailable immediately without hanging
              return {
                status: 'unavailable',
                source: 'ISRIC SoilGrids',
                verifiedAt: null,
                data: null,
                isRateLimited: true,
                reason: 'provider_cooldown',
                remainingCooldownSeconds: remainingSecs,
                error: `SoilGrids provider failure cooldown active. Retry after ${remainingSecs}s`,
              };
            }
          }
        } catch (cdErr) {
          console.error('[EnvironmentService] SoilGrids cooldown check error:', cdErr.message);
        }

        const result = await this.soilGridsProvider.fetchSoil({
          latitude: parsedLat,
          longitude: parsedLng,
          timeoutMs: options.timeoutMs,
          signal: options.signal,
          parentPermitHolder: options.parentPermitHolder,
        });

        // Commit to cache ONLY if valid measurements exist (never cache NoData or urban mask as available)
        const hasValidMeasurements =
          result &&
          result.status === 'available' &&
          defaultCacheRepo.isValidSoilMeasurements(result.data);

        if (hasValidMeasurements && !result.stale) {
          // Attach spatial precision to fresh live measurement
          result.metadata = {
            ...(result.metadata || {}),
            spatialPrecision: 'same_query_location',
          };

          // Store in L1 cache
          this._setCache(this.soilCache, exactSoilKey, result, this.SOIL_TTL_MS);

          // Persist to L2 database cache (90-day TTL)
          try {
            if (this.cacheRepo && typeof this.cacheRepo.upsertCache === 'function') {
              await this.cacheRepo.upsertCache({
                gridKey: cellKey,
                cacheType: 'soil_exact',
                latitude: parsedLat,
                longitude: parsedLng,
                source: result.source || 'ISRIC SoilGrids',
                status: 'available',
                data: result.data,
                metadata: {
                  ...(result.metadata || {}),
                  isExactRasterCell: false,
                  isExactSiteMeasurement: false,
                  spatialPrecision: 'same_query_location',
                  spatialMethod: 'approximate_wgs84_grid_bucket',
                  nominalResolution: '~250m (localized WGS84 approximation)',
                  cellKey,
                  gridCenter: { latitude: snappedLat, longitude: snappedLng },
                  targetLocation: { latitude: parsedLat, longitude: parsedLng },
                  scientificDisclaimer: 'Modeled ~250m raster estimation; does not represent an in-situ physical core sample.',
                },
                verifiedAt: result.verifiedAt || new Date().toISOString(),
                expiresAt: new Date(Date.now() + this.SOIL_TTL_MS),
              });
            }
          } catch (upsertErr) {
            console.error('[EnvironmentService] Failed to upsert soil to L2 cache:', upsertErr.message);
          }
          return result;
        }

        // Live request failed (timeout, network error, or cooldown) -> fallback to L2 stale candidate if available
        if (dbStaleCandidate) {
          return this._formatStaleSoil(
            dbStaleCandidate,
            parsedLat,
            parsedLng,
            cellKey,
            snappedLat,
            snappedLng,
            `Live soil provider unavailable (${result.error || result.reason || 'timeout'}). Serving cached soil properties.`
          );
        }

        if (result?.status === 'unavailable') {
          this._setCache(this.soilFailures, exactSoilKey, result, result.reason === 'urban_mask' ? 3600000 : 10000);
        }
        return result;
      } finally {
        this.pendingSoil.delete(exactSoilKey);
      }
    })();

    this.pendingSoil.set(exactSoilKey, fetchPromise);
    return fetchPromise;
  }

  /**
   * Calculates haversine distance between two coordinates in kilometers.
   * @private
   */
  _calculateDistanceKm(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  _soilForTarget(result, lat, lng) {
    if (!result?.data) return result;
    const copy = JSON.parse(JSON.stringify(result));
    const source = copy.metadata?.sourceLocation || copy.metadata?.targetLocation;
    if (source) {
      const distance = Math.round(this._calculateDistanceKm(lat, lng, source.latitude, source.longitude) * 1000);
      copy.metadata = {
        ...copy.metadata, sourceLocation: source, targetLocation: { latitude: lat, longitude: lng },
        distanceFromObservedMeters: distance,
        spatialPrecision: distance > 15 ? 'approximate_grid_bucket' : 'same_query_location',
        isExactSiteMeasurement: false,
      };
      if (distance > 15) copy.warning = `Cached modeled soil profile approximately ${distance}m from this point; not an exact-site measurement.`;
    }
    return copy;
  }

  _regionalForTarget(result, lat, lng) {
    if (!result) return result;
    const copy = JSON.parse(JSON.stringify(result));
    copy.targetLocation = { latitude: lat, longitude: lng };
    if (copy.sampleLocation) {
      const sample = copy.sampleLocation;
      copy.distanceKm = Math.round(this._calculateDistanceKm(lat, lng, sample.latitude, sample.longitude) * 10) / 10;
      const north = sample.latitude - lat;
      const east = (sample.longitude - lng) * Math.cos(lat * Math.PI / 180);
      copy.direction = Math.abs(north) >= Math.abs(east) ? (north >= 0 ? 'North' : 'South') : (east >= 0 ? 'East' : 'West');
      copy.warning = `${copy.stale ? 'Cached' : 'Regional'} soil baseline (${copy.distanceKm} km ${copy.direction} of site). Not an exact-site measurement; urban soil conditions may differ.`;
    }
    return copy;
  }

  async getRegionalSoilBaseline(lat, lng, options = {}) {
    const key = this.computeSoilRasterCell(lat, lng).cellKey;
    // Cache-only fallbacks must never join a session that launches new probes.
    if (options.cacheOnly) return this._getRegionalSoilBaseline(lat, lng, options);
    if (this.pendingRegional.has(key)) return this._regionalForTarget(await this.pendingRegional.get(key), lat, lng);
    const pending = this._getRegionalSoilBaseline(lat, lng, options);
    this.pendingRegional.set(key, pending);
    try { return await pending; } finally { this.pendingRegional.delete(key); }
  }

  /**
   * Bounded regional sampling strategy when exact site soil data is unavailable (urban mask).
   * Evaluates up to four cardinal probes (North, East, South, West) at configurable distance (10km).
   * Runs probes concurrently under a shared regional session permit, short-circuiting on the first
   * valid observation and immediately canceling in-flight probes to preserve upstream resources.
   * Preserves complete spatial provenance and supports fresh and stale L1/L2 regional cache fallback.
   * Never stores regional data under the exact-site cache key.
   * @param {number} lat - Target latitude
   * @param {number} lng - Target longitude
   * @param {object} [options={}]
   * @param {AbortSignal} [options.signal]
   * @param {number} [options.remainingDeadlineMs]
   * @returns {Promise<object|null>}
   */
  async _getRegionalSoilBaseline(lat, lng, options = {}) {
    const distanceKm = config.providers.soilGrids.regionalDistanceKm || 10;
    const { cellKey } = this.computeSoilRasterCell(lat, lng);
    const regionalKey = `regional:${cellKey}`;
    const regionalDbKey = `${cellKey}:d${distanceKm}`;
    const now = Date.now();
    let dbRegionalStaleCandidate = null;

    // 1. Check L1 in-memory regional cache
    const cachedRegional = this.regionalCache.get(regionalKey);
    if (cachedRegional && now < cachedRegional.expiresAt) {
      cachedRegional.lastAccessed = now;
      return this._regionalForTarget(cachedRegional.data, lat, lng);
    }

    // 2. Check L2 persistent database regional cache
    try {
      if (this.cacheRepo && typeof this.cacheRepo.findByGridAndType === 'function') {
        const dbRow = await this.cacheRepo.findByGridAndType(regionalDbKey, 'soil_regional');
        if (dbRow && dbRow.data) {
          const expiresAtMs = new Date(dbRow.expires_at).getTime();
          if (now < expiresAtMs) {
            const meta = dbRow.metadata || {};
            const cachedResult = {
              status: 'regional_baseline',
              isRegional: true,
              source: dbRow.source || 'ISRIC SoilGrids (Regional Baseline)',
              samplingMethod: meta.samplingMethod || 'cardinal_radial_probe',
              sampleLocation: meta.sampleLocation || null,
              targetLocation: meta.targetLocation || { latitude: lat, longitude: lng },
              distanceKm: meta.distanceKm || distanceKm,
              direction: meta.direction || 'Unknown',
              spatialPrecision: 'regional_baseline',
              isExactRasterCell: false,
              isExactSiteMeasurement: false,
              warning: `Regional soil baseline derived from nearby non-urban profile (${meta.distanceKm || distanceKm} km ${meta.direction || ''} of site). Not an exact-site measurement; urban soil conditions may differ.`,
              verifiedAt: new Date(dbRow.verified_at).toISOString(),
              stale: false,
              data: dbRow.data,
            };
            this._setCache(this.regionalCache, regionalKey, cachedResult, expiresAtMs - now);
            return this._regionalForTarget(cachedResult, lat, lng);
          } else {
            dbRegionalStaleCandidate = dbRow;
          }
        }
      }
    } catch (dbErr) {
      console.error('[EnvironmentService] L2 regional soil cache lookup error:', dbErr.message);
    }

    if (options.cacheOnly) {
      return dbRegionalStaleCandidate
        ? this._regionalForTarget(this._formatStaleRegionalSoil(dbRegionalStaleCandidate, lat, lng, distanceKm), lat, lng)
        : null;
    }

    // 3. Check active SoilGrids cooldown before outbound probing
    try {
      if (this.cacheRepo && typeof this.cacheRepo.getProviderCooldown === 'function') {
        const cd = await this.cacheRepo.getProviderCooldown('soilgrids');
        if (cd && cd.cooldownUntil && cd.cooldownUntil.getTime() > now) {
          const remainingSecs = Math.max(1, Math.ceil((cd.cooldownUntil.getTime() - now) / 1000));
          if (dbRegionalStaleCandidate) {
            return this._formatStaleRegionalSoil(dbRegionalStaleCandidate, lat, lng, distanceKm, remainingSecs);
          }
          return null;
        }
      }
    } catch (cdErr) {
      console.error('[EnvironmentService] Regional probe cooldown check error:', cdErr.message);
    }

    // 4. Coordinate outbound permit session across parallel probes
    const sessionPermitHolder = `sg_reg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    let permit = null;
    if (this.cacheRepo && typeof this.cacheRepo.acquireOutboundPermit === 'function') {
      permit = await this.cacheRepo.acquireOutboundPermit('soilgrids', 10, sessionPermitHolder);
      if (permit.inCooldown) {
        if (dbRegionalStaleCandidate) {
          return this._formatStaleRegionalSoil(dbRegionalStaleCandidate, lat, lng, distanceKm, permit.retryAfterSeconds);
        }
        return null;
      }
      if (!permit.granted) {
        // Another backend instance holds active outbound permit
        if (dbRegionalStaleCandidate) {
          return this._formatStaleRegionalSoil(dbRegionalStaleCandidate, lat, lng, distanceKm);
        }
        return null;
      }
    }

    const deltaLat = distanceKm / 111.0;
    const cosLat = Math.cos((lat * Math.PI) / 180);
    const deltaLng = Math.abs(cosLat) > 0.001 ? distanceKm / (111.32 * cosLat) : distanceKm / 111.32;

    const probes = [
      { direction: 'North', lat: lat + deltaLat, lng },
      { direction: 'East', lat, lng: lng + deltaLng },
      { direction: 'South', lat: lat - deltaLat, lng },
      { direction: 'West', lat, lng: lng - deltaLng },
    ];

    const probeAbortController = new AbortController();
    let removeParentSignalListener = null;
    if (options.signal) {
      if (options.signal.aborted) {
        probeAbortController.abort(options.signal.reason);
      } else {
        const onParentAbort = () => probeAbortController.abort(options.signal.reason);
        options.signal.addEventListener('abort', onParentAbort, { once: true });
        removeParentSignalListener = () => options.signal.removeEventListener('abort', onParentAbort);
      }
    }

    const probeTimeoutMs = options.remainingDeadlineMs
      ? Math.min(config.providers.soilGrids.probeTimeoutMs || 2000, options.remainingDeadlineMs)
      : config.providers.soilGrids.probeTimeoutMs || 2000;

    try {
      // Execute 4 cardinal probes concurrently under the shared session permit
      const probePromises = probes.map((probe) => {
        const probeLat = Math.max(-90, Math.min(90, probe.lat));
        const probeLng = Math.max(-180, Math.min(180, probe.lng));
        return this.getSoil(probeLat, probeLng, {
          parentPermitHolder: sessionPermitHolder,
          signal: probeAbortController.signal,
          timeoutMs: probeTimeoutMs,
        })
          .then((res) => ({ probe, probeLat, probeLng, res }))
          .catch((err) => ({ probe, probeLat, probeLng, err }));
      });

      // Short-circuit on the first valid physical measurement and abort in-flight competitors
      let winningProbe = null;
      await new Promise((resolve) => {
        let remaining = probePromises.length;
        probePromises.forEach((promise) => {
          promise.then((outcome) => {
            const { res } = outcome;
            if (
              !winningProbe &&
              res &&
              res.status === 'available' &&
              defaultCacheRepo.isValidSoilMeasurements(res.data)
            ) {
              winningProbe = outcome;
              probeAbortController.abort(); // Cancel remaining in-flight probes
              resolve();
            } else {
              remaining--;
              if (remaining === 0) {
                resolve();
              }
            }
          });
        });
      });

      if (winningProbe) {
        const { probe: p, probeLat, probeLng, res } = winningProbe;
        const sample = res.metadata?.sourceLocation || res.metadata?.targetLocation || { latitude: probeLat, longitude: probeLng };
        const actualDist = Math.round(this._calculateDistanceKm(lat, lng, sample.latitude, sample.longitude) * 10) / 10;
        const baselineResult = {
          status: 'regional_baseline',
          isRegional: true,
          source: 'ISRIC SoilGrids (Regional Baseline)',
          samplingMethod: 'cardinal_radial_probe',
          sampleLocation: {
            latitude: sample.latitude,
            longitude: sample.longitude,
          },
          targetLocation: {
            latitude: Math.round(lat * 10000) / 10000,
            longitude: Math.round(lng * 10000) / 10000,
          },
          distanceKm: actualDist,
          direction: p.direction,
          spatialPrecision: 'regional_baseline',
          isExactRasterCell: false,
          isExactSiteMeasurement: false,
          warning: `Regional soil baseline derived from nearby non-urban profile (${actualDist} km ${p.direction} of site). Not an exact-site measurement; urban soil conditions may differ.`,
          verifiedAt: res.verifiedAt || new Date().toISOString(),
          stale: Boolean(res.stale),
          data: res.data,
        };

        // Cache in L1 regional cache (NEVER under the exact-site cache key)
        if (!res.stale) this._setCache(this.regionalCache, regionalKey, baselineResult, this.SOIL_TTL_MS);

        // Persist to L2 database regional cache
        try {
          if (!res.stale && this.cacheRepo && typeof this.cacheRepo.upsertCache === 'function') {
            await this.cacheRepo.upsertCache({
              gridKey: regionalDbKey,
              cacheType: 'soil_regional',
              latitude: lat,
              longitude: lng,
              source: 'ISRIC SoilGrids (Regional Baseline)',
              status: 'regional_baseline',
              data: res.data,
              metadata: {
                isRegional: true,
                samplingMethod: 'cardinal_radial_probe',
                direction: p.direction,
                distanceKm: actualDist,
                sampleLocation: baselineResult.sampleLocation,
                targetLocation: baselineResult.targetLocation,
                spatialPrecision: 'regional_baseline',
              },
              verifiedAt: baselineResult.verifiedAt,
              expiresAt: new Date(Date.now() + this.SOIL_TTL_MS),
            });
          }
        } catch (upsertErr) {
          console.error('[EnvironmentService] Failed to upsert regional soil to L2 cache:', upsertErr.message);
        }

        return baselineResult;
      }

      // If all probes failed / returned urban mask / timed out -> fallback to stale regional if present
      if (dbRegionalStaleCandidate) {
        return this._formatStaleRegionalSoil(dbRegionalStaleCandidate, lat, lng, distanceKm);
      }

      return null;
    } finally {
      if (removeParentSignalListener) removeParentSignalListener();
      if (permit && permit.granted && this.cacheRepo && typeof this.cacheRepo.releaseOutboundPermit === 'function') {
        try {
          await this.cacheRepo.releaseOutboundPermit('soilgrids', sessionPermitHolder);
        } catch (relErr) {
          console.error('[EnvironmentService] Error releasing regional session permit:', relErr.message);
        }
      }
    }
  }

  /**
   * Retrieves environmental conditions for a specific location.
   * Concurrently queries Open-Meteo and ISRIC SoilGrids with deduplication and tiered caching.
   * Bounds weather and soil independently; section queries let the UI show each as it completes.
   * If exact-site soil data is unavailable (urban mask), optionally queries regional baseline.
   * @param {object} params
   * @param {number|string} params.lat - Latitude coordinate
   * @param {number|string} params.lng - Longitude coordinate
   * @param {boolean} [params.enableRegionalBaseline=true] - Whether to attempt regional probe on urban NoData
   * @returns {Promise<object>} Normalized environmental assessment data
   */
  async getLocationEnvironment({ lat, lng, enableRegionalBaseline = true, section }) {
    if (section && !['weather', 'soil'].includes(section)) {
      throw new BadRequestError('Section must be weather or soil', 'INVALID_SECTION');
    }
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

    const bounded = async (name, work, budget) => {
      const controller = new AbortController();
      let timer;
      const unavailable = {
        status: 'unavailable', source: name === 'weather' ? 'Open-Meteo' : 'ISRIC SoilGrids',
        verifiedAt: null, data: null, reason: 'timeout', error: `${name} assessment deadline exceeded`,
      };
      try {
        return await Promise.race([
          Promise.resolve().then(() => work(controller.signal)).catch(() => ({ ...unavailable, reason: 'provider_error' })),
          new Promise((resolve) => {
            timer = setTimeout(() => {
              const error = new Error('ASSESSMENT_DEADLINE_EXCEEDED');
              error.name = 'TimeoutError';
              controller.abort(error);
              resolve(unavailable);
            }, budget);
          }),
        ]);
      } finally { clearTimeout(timer); }
    };

    const soilBudget = config.providers.soilGrids.overallDeadlineMs || 4500;
    const weatherBudget = Math.min(config.providers.openMeteo.timeoutMs, 4500);
    const resolveSoil = async (signal) => {
      const started = Date.now();
      // Reuse a valid regional profile immediately when we already know this bucket
      // is masked or recently failed. Never launch probes on a timeout/error.
      const key = `soil_exact:${this.computeSoilRasterCell(parsedLat, parsedLng).cellKey}`;
      const priorFailure = this.soilFailures.get(key);
      const regionalEnabled = enableRegionalBaseline !== false && config.providers.soilGrids.enableRegionalBaseline !== false;
      const cachedRegionalPromise = regionalEnabled
        ? this.getRegionalSoilBaseline(parsedLat, parsedLng, { cacheOnly: true })
        : Promise.resolve(null);
      if (regionalEnabled && priorFailure && Date.now() < priorFailure.expiresAt) {
        const cached = await cachedRegionalPromise;
        if (cached) return cached;
      }
      const exact = await this.getSoil(parsedLat, parsedLng, {
        signal, timeoutMs: config.providers.soilGrids.exactTimeoutMs || 4200,
      });
      if (exact?.status === 'available' || !regionalEnabled) return exact;
      const cachedRegional = await cachedRegionalPromise;
      if (cachedRegional) return cachedRegional;
      if (exact?.reason !== 'urban_mask' || signal.aborted) return exact;
      const remainingDeadlineMs = soilBudget - (Date.now() - started);
      const regional = await this.getRegionalSoilBaseline(parsedLat, parsedLng, {
        signal, remainingDeadlineMs: Math.max(1, remainingDeadlineMs),
        cacheOnly: exact?.reason !== 'urban_mask' || signal.aborted || remainingDeadlineMs <= 0,
      });
      return regional || exact;
    };

    const [weather, soil] = await Promise.all([
      section === 'soil' ? undefined : bounded('weather', (signal) => this.getWeather(parsedLat, parsedLng, {
        signal, timeoutMs: weatherBudget,
      }), weatherBudget),
      section === 'weather' ? undefined : bounded('soil', resolveSoil, soilBudget),
    ]);

      return {
        location: {
          latitude: parsedLat,
          longitude: parsedLng,
        },
        ...(weather ? { weather } : {}),
        ...(soil ? { soil } : {}),
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

const environmentService = new EnvironmentService();
environmentService.EnvironmentService = EnvironmentService;

module.exports = environmentService;
