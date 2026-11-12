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
    this.soilCache = new Map(); // key -> { data, expiresAt, lastAccessed }
    this.regionalCache = new Map(); // key -> { data, expiresAt, lastAccessed }
    this.pendingWeather = new Map(); // key -> Promise<weather>
    this.pendingSoil = new Map(); // key -> Promise<soil>

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
   * @returns {Promise<object>}
   */
  async getWeather(parsedLat, parsedLng) {
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
        const result = await this.openMeteoProvider.fetchWeather({ latitude: parsedLat, longitude: parsedLng });

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
          };
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
   * Retrieves soil properties using actual SoilGrids 250m raster cell identity.
   * Caches exact-site measurements in L1 and L2 persistent storage (90-day TTL).
   * In-flight promise deduplication wraps the entire retrieval to prevent race conditions.
   * @param {number} parsedLat
   * @param {number} parsedLng
   * @returns {Promise<object>}
   */
  async getSoil(parsedLat, parsedLng) {
    const { cellKey, snappedLat, snappedLng } = this.computeSoilRasterCell(parsedLat, parsedLng);
    const exactSoilKey = `soil_exact:${cellKey}`;
    const now = Date.now();

    // 1. Tier 1: In-memory L1 cache
    const cached = this.soilCache.get(exactSoilKey);
    if (cached && now < cached.expiresAt) {
      cached.lastAccessed = now;
      return JSON.parse(JSON.stringify(cached.data));
    }

    // 2. Deduplication: in-flight request coalescing
    if (this.pendingSoil.has(exactSoilKey)) {
      return this.pendingSoil.get(exactSoilKey);
    }

    const fetchPromise = (async () => {
      try {
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
                    spatialPrecision: isNearbyObservation ? 'approximate_grid_bucket' : 'exact_coordinates',
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
              }
            }
          }
        } catch (dbErr) {
          console.error('[EnvironmentService] L2 soil cache lookup error:', dbErr.message);
        }

        const result = await this.soilGridsProvider.fetchSoil({ latitude: parsedLat, longitude: parsedLng });

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
                  spatialPrecision: 'exact_query_coordinates',
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
    return Math.round(R * c * 10) / 10;
  }

  /**
   * Bounded regional sampling strategy when exact site soil data is unavailable (urban mask).
   * Evaluates up to four cardinal probes (North, East, South, West) at configurable distance.
   * Uses the first valid response and preserves complete metadata (distance, direction, probe site).
   * Never stores regional data under the exact-site cache key.
   * @param {number} lat - Target latitude
   * @param {number} lng - Target longitude
   * @returns {Promise<object|null>}
   */
  async getRegionalSoilBaseline(lat, lng) {
    const distanceKm = config.providers.soilGrids.regionalDistanceKm || 10;
    const { cellKey } = this.computeSoilRasterCell(lat, lng);
    const regionalKey = `regional:${Number(lat).toFixed(2)}:${Number(lng).toFixed(2)}`;
    const regionalDbKey = `${cellKey}:d${distanceKm}`;
    const now = Date.now();

    // 1. Check L1 in-memory regional cache
    const cachedRegional = this.regionalCache.get(regionalKey);
    if (cachedRegional && now < cachedRegional.expiresAt) {
      cachedRegional.lastAccessed = now;
      return JSON.parse(JSON.stringify(cachedRegional.data));
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
              warning: `Regional soil baseline derived from nearby non-urban profile (${meta.distanceKm || distanceKm} km ${meta.direction || ''} of site). Not an exact-site measurement; urban soil conditions may differ.`,
              verifiedAt: new Date(dbRow.verified_at).toISOString(),
              stale: false,
              data: dbRow.data,
            };
            this._setCache(this.regionalCache, regionalKey, cachedResult, expiresAtMs - now);
            return cachedResult;
          }
        }
      }
    } catch (dbErr) {
      console.error('[EnvironmentService] L2 regional soil cache lookup error:', dbErr.message);
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
            targetLocation: {
              latitude: Math.round(lat * 10000) / 10000,
              longitude: Math.round(lng * 10000) / 10000,
            },
            distanceKm: actualDist,
            direction: probe.direction,
            warning: `Regional soil baseline derived from nearby non-urban profile (${actualDist} km ${probe.direction} of site). Not an exact-site measurement; urban soil conditions may differ.`,
            verifiedAt: new Date().toISOString(),
            stale: false,
            data: probeResult.data,
          };

          // Cache in L1 regional cache (NEVER under the exact-site cache key)
          this._setCache(this.regionalCache, regionalKey, baselineResult, this.SOIL_TTL_MS);

          // Persist to L2 database regional cache
          try {
            if (this.cacheRepo && typeof this.cacheRepo.upsertCache === 'function') {
              await this.cacheRepo.upsertCache({
                gridKey: regionalDbKey,
                cacheType: 'soil_regional',
                latitude: lat,
                longitude: lng,
                source: 'ISRIC SoilGrids (Regional Baseline)',
                status: 'regional_baseline',
                data: probeResult.data,
                metadata: {
                  isRegional: true,
                  samplingMethod: 'cardinal_radial_probe',
                  direction: probe.direction,
                  distanceKm: actualDist,
                  sampleLocation: baselineResult.sampleLocation,
                  targetLocation: baselineResult.targetLocation,
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
      } catch {
        // Continue to next probe on probe failure
      }
    }

    return null;
  }

  /**
   * Retrieves environmental conditions for a specific location.
   * Concurrently queries Open-Meteo and ISRIC SoilGrids with deduplication and tiered caching.
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

    // Execute provider lookups concurrently with deduplication and tiered caching
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

const environmentService = new EnvironmentService();
environmentService.EnvironmentService = EnvironmentService;

module.exports = environmentService;
