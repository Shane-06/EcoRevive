'use strict';

const db = require('../config/db');

/**
 * Validates weather measurements prior to persistent caching.
 * @param {object} data
 * @returns {boolean}
 */
function isValidWeatherMeasurements(data) {
  if (!data || typeof data !== 'object') return false;
  const { temperature, humidity, precipitation, windSpeed } = data;
  if (temperature === null || temperature === undefined || typeof temperature !== 'number' || isNaN(temperature)) return false;
  if (temperature < -60 || temperature > 65) return false;
  if (humidity === null || humidity === undefined || typeof humidity !== 'number' || isNaN(humidity)) return false;
  if (humidity < 0 || humidity > 100) return false;
  if (precipitation === null || precipitation === undefined || typeof precipitation !== 'number' || isNaN(precipitation)) return false;
  if (precipitation < 0) return false;
  if (windSpeed === null || windSpeed === undefined || typeof windSpeed !== 'number' || isNaN(windSpeed)) return false;
  if (windSpeed < 0) return false;
  return true;
}

const VALID_SOIL_TEXTURES = new Set([
  'Clay',
  'Sand',
  'Loamy sand',
  'Silt',
  'Silty clay loam',
  'Clay loam',
  'Sandy clay loam',
  'Silt loam',
  'Sandy loam',
  'Loam',
  'Sandy clay',
  'Silty clay',
]);

/**
 * Validates soil measurements prior to persistent caching.
 * Requires at least one valid physical measurement (pH, organic carbon, or texture/percentages).
 * Validates USDA soil texture classes and organic carbon boundaries (0-1000 g/kg).
 * Never allows NoData / all-null urban mask responses into the cache.
 * @param {object} data
 * @returns {boolean}
 */
function isValidSoilMeasurements(data) {
  if (!data || typeof data !== 'object') return false;
  const { ph, clayPercentage, sandPercentage, siltPercentage, texture, organicCarbon } = data;

  // Detect when all physical properties are null/missing (rejecting all-null urban mask responses)
  const allNull =
    (ph === null || ph === undefined) &&
    (clayPercentage === null || clayPercentage === undefined) &&
    (sandPercentage === null || sandPercentage === undefined) &&
    (siltPercentage === null || siltPercentage === undefined) &&
    (texture === null || texture === undefined) &&
    (organicCarbon === null || organicCarbon === undefined);

  if (allNull) return false;

  // Validate pH if present
  if (ph !== null && ph !== undefined) {
    if (typeof ph !== 'number' || isNaN(ph) || ph < 2.0 || ph > 12.0) return false;
  }

  // Validate clay percentage if present
  if (clayPercentage !== null && clayPercentage !== undefined) {
    if (typeof clayPercentage !== 'number' || isNaN(clayPercentage) || clayPercentage < 0 || clayPercentage > 100) return false;
  }

  // Validate sand percentage if present
  if (sandPercentage !== null && sandPercentage !== undefined) {
    if (typeof sandPercentage !== 'number' || isNaN(sandPercentage) || sandPercentage < 0 || sandPercentage > 100) return false;
  }

  // Validate silt percentage if present
  if (siltPercentage !== null && siltPercentage !== undefined) {
    if (typeof siltPercentage !== 'number' || isNaN(siltPercentage) || siltPercentage < 0 || siltPercentage > 100) return false;
  }

  // Validate texture if present
  if (texture !== null && texture !== undefined) {
    if (typeof texture !== 'string' || !VALID_SOIL_TEXTURES.has(texture)) return false;
  }

  // Validate organic carbon (soc in g/kg) if present
  if (organicCarbon !== null && organicCarbon !== undefined) {
    if (typeof organicCarbon !== 'number' || isNaN(organicCarbon) || organicCarbon < 0 || organicCarbon > 1000) return false;
  }

  return true;
}

class EnvironmentCacheRepository {
  constructor(deps = {}) {
    this._db = deps.db || deps.pool || db;
  }

  async _query(sql, params = []) {
    if (this._db && typeof this._db.query === 'function') {
      return this._db.query(sql, params);
    }
    return db.query(sql, params);
  }

  /**
   * Retrieves a cached record by grid key and cache type.
   * @param {string} gridKey - Spatial grid identifier
   * @param {'weather'|'soil_exact'|'soil_regional'} cacheType - Cache category
   * @returns {Promise<object|null>}
   */
  async findByGridAndType(gridKey, cacheType) {
    if (!gridKey || !cacheType) return null;
    try {
      const sql = `
        SELECT grid_key, cache_type, latitude, longitude, source, status, data, metadata, verified_at, expires_at
        FROM environment_cache
        WHERE grid_key = $1 AND cache_type = $2;
      `;
      const res = await this._query(sql, [gridKey, cacheType]);
      if (res.rows && res.rows.length > 0) {
        return res.rows[0];
      }
      return null;
    } catch (err) {
      console.error('[EnvironmentCacheRepository] findByGridAndType error:', err.message);
      return null;
    }
  }

  /**
   * Upserts a validated environmental measurement into persistent storage.
   * @param {object} params
   * @param {string} params.gridKey - Unique spatial key
   * @param {'weather'|'soil_exact'|'soil_regional'} params.cacheType - Cache category
   * @param {number} params.latitude - Original latitude
   * @param {number} params.longitude - Original longitude
   * @param {string} params.source - Originating provider
   * @param {'available'|'regional_baseline'} [params.status='available'] - Assessment state
   * @param {object} params.data - Validated physical properties
   * @param {object} [params.metadata={}] - Traceability metadata (distance, direction, probe site)
   * @param {Date|string} params.verifiedAt - Timestamp of observation
   * @param {Date|string} params.expiresAt - Freshness threshold
   * @returns {Promise<object|null>}
   */
  async upsertCache({
    gridKey,
    cacheType,
    latitude,
    longitude,
    source,
    status = 'available',
    data,
    metadata = {},
    verifiedAt,
    expiresAt,
  }) {
    if (!gridKey || !cacheType || !data) return null;

    // Validate payload measurements before persistence
    if (cacheType === 'weather') {
      if (!isValidWeatherMeasurements(data)) {
        return null;
      }
    } else if (cacheType === 'soil_exact' || cacheType === 'soil_regional') {
      if (!isValidSoilMeasurements(data)) {
        return null;
      }
    } else {
      return null;
    }

    try {
      const sql = `
        INSERT INTO environment_cache (
          grid_key, cache_type, latitude, longitude, source, status, data, metadata, verified_at, expires_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP)
        ON CONFLICT (grid_key, cache_type) DO UPDATE SET
          latitude = EXCLUDED.latitude,
          longitude = EXCLUDED.longitude,
          source = EXCLUDED.source,
          status = EXCLUDED.status,
          data = EXCLUDED.data,
          metadata = EXCLUDED.metadata,
          verified_at = EXCLUDED.verified_at,
          expires_at = EXCLUDED.expires_at,
          updated_at = CURRENT_TIMESTAMP
        RETURNING *;
      `;

      const res = await this._query(sql, [
        gridKey,
        cacheType,
        latitude,
        longitude,
        source,
        status,
        JSON.stringify(data),
        JSON.stringify(metadata),
        new Date(verifiedAt),
        new Date(expiresAt),
      ]);

      return res.rows && res.rows.length > 0 ? res.rows[0] : null;
    } catch (err) {
      console.error('[EnvironmentCacheRepository] upsertCache error:', err.message);
      return null;
    }
  }

  /**
   * Retrieves active provider-level cooldown expiration from database.
   * @param {string} providerName - e.g. 'open-meteo'
   * @returns {Promise<{cooldownUntil: Date, retryAfterSeconds: number, reason: string}|null>}
   */
  async getProviderCooldown(providerName) {
    if (!providerName) return null;
    try {
      const sql = `
        SELECT cooldown_until, status_code, retry_after_seconds, reason
        FROM provider_cooldowns
        WHERE provider_name = $1 AND cooldown_until > CURRENT_TIMESTAMP;
      `;
      const res = await this._query(sql, [providerName]);
      if (res.rows && res.rows.length > 0) {
        return {
          cooldownUntil: new Date(res.rows[0].cooldown_until),
          retryAfterSeconds: res.rows[0].retry_after_seconds,
          reason: res.rows[0].reason,
        };
      }
      return null;
    } catch (err) {
      console.error('[EnvironmentCacheRepository] getProviderCooldown error:', err.message);
      return null;
    }
  }

  /**
   * Persists provider-level rate-limit cooldown using strictly parameterized SQL and bounded seconds.
   * @param {string} providerName - Provider key
   * @param {number} retryAfterSeconds - Seconds until cooldown expires
   * @param {string} [reason=''] - Diagnostic reason
   * @returns {Promise<boolean>}
   */
  async setProviderCooldown(providerName, retryAfterSeconds, reason = '') {
    if (!providerName) return false;

    // Guard: Safely bound retry-after seconds (1s minimum, 24h / 86400s maximum)
    const boundedSeconds = Math.max(1, Math.min(86400, parseInt(retryAfterSeconds, 10) || 60));
    const cooldownUntilDate = new Date(Date.now() + boundedSeconds * 1000);

    try {
      const sql = `
        INSERT INTO provider_cooldowns (
          provider_name, cooldown_until, status_code, retry_after_seconds, reason, permit_holder, permit_expires_at, updated_at
        ) VALUES ($1, $2, 429, $3, $4, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT (provider_name) DO UPDATE SET
          cooldown_until = EXCLUDED.cooldown_until,
          status_code = 429,
          retry_after_seconds = EXCLUDED.retry_after_seconds,
          reason = EXCLUDED.reason,
          permit_holder = NULL,
          permit_expires_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP;
      `;
      await this._query(sql, [providerName, cooldownUntilDate, boundedSeconds, reason]);
      return true;
    } catch (err) {
      console.error('[EnvironmentCacheRepository] setProviderCooldown error:', err.message);
      return false;
    }
  }

  /**
   * Coordinates outbound provider requests across multiple backend instances.
   * Atomically verifies that no active cooldown exists, and leases an in-flight permit.
   * If another instance holds an active permit or the provider is in cooldown, permit is denied.
   * @param {string} providerName - e.g. 'open-meteo'
   * @param {number} [leaseDurationSec=10] - Lease duration in seconds
   * @param {string} [instanceId] - Unique instance identifier
   * @returns {Promise<{granted: boolean, inCooldown: boolean, cooldownUntil?: Date, retryAfterSeconds?: number, reason?: string, permitHolder?: string}>}
   */
  async acquireOutboundPermit(
    providerName,
    leaseDurationSec = 10,
    instanceId = `inst_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
  ) {
    if (!providerName) return { granted: false, inCooldown: false };
    const boundedLease = Math.max(1, Math.min(60, leaseDurationSec));

    try {
      // 1. Fast check: active cooldown
      const activeCd = await this.getProviderCooldown(providerName);
      if (activeCd && activeCd.cooldownUntil && activeCd.cooldownUntil.getTime() > Date.now()) {
        return {
          granted: false,
          inCooldown: true,
          cooldownUntil: activeCd.cooldownUntil,
          retryAfterSeconds: activeCd.retryAfterSeconds,
          reason: activeCd.reason,
        };
      }

      // 2. Atomic UPSERT/UPDATE with row-level condition
      const sql = `
        INSERT INTO provider_cooldowns (
          provider_name, cooldown_until, status_code, retry_after_seconds, permit_holder, permit_expires_at, updated_at
        ) VALUES (
          $1, CURRENT_TIMESTAMP, 200, 0, $2, CURRENT_TIMESTAMP + ($3 * INTERVAL '1 second'), CURRENT_TIMESTAMP
        )
        ON CONFLICT (provider_name) DO UPDATE SET
          permit_holder = EXCLUDED.permit_holder,
          permit_expires_at = EXCLUDED.permit_expires_at,
          updated_at = CURRENT_TIMESTAMP
        WHERE provider_cooldowns.cooldown_until <= CURRENT_TIMESTAMP
          AND (provider_cooldowns.permit_expires_at IS NULL OR provider_cooldowns.permit_expires_at <= CURRENT_TIMESTAMP)
        RETURNING provider_name, cooldown_until, retry_after_seconds, permit_holder, permit_expires_at;
      `;

      const res = await this._query(sql, [providerName, instanceId, boundedLease]);
      if (res.rows && res.rows.length > 0) {
        return { granted: true, inCooldown: false, permitHolder: instanceId };
      }

      // If 0 rows were updated, check whether cooldown intervened or another instance won the permit
      const checkRow = await this.getProviderCooldown(providerName);
      if (checkRow && checkRow.cooldownUntil && checkRow.cooldownUntil.getTime() > Date.now()) {
        return {
          granted: false,
          inCooldown: true,
          cooldownUntil: checkRow.cooldownUntil,
          retryAfterSeconds: checkRow.retryAfterSeconds,
          reason: checkRow.reason,
        };
      }

      return {
        granted: false,
        inCooldown: false,
        reason: 'Concurrent backend instance holds active outbound permit',
      };
    } catch (err) {
      console.error('[EnvironmentCacheRepository] acquireOutboundPermit error:', err.message);
      // Fail closed to prevent thundering herd when DB error occurs
      return { granted: false, inCooldown: false, error: err.message };
    }
  }

  /**
   * Releases an outbound permit after request finishes or fails.
   * @param {string} providerName
   * @param {string} permitHolder
   * @returns {Promise<boolean>}
   */
  async releaseOutboundPermit(providerName, permitHolder) {
    if (!providerName || !permitHolder) return false;
    try {
      const sql = `
        UPDATE provider_cooldowns
        SET permit_expires_at = CURRENT_TIMESTAMP,
            permit_holder = NULL,
            updated_at = CURRENT_TIMESTAMP
        WHERE provider_name = $1 AND permit_holder = $2
        RETURNING provider_name;
      `;
      const res = await this._query(sql, [providerName, permitHolder]);
      return !!(res.rows && res.rows.length > 0);
    } catch (err) {
      console.error('[EnvironmentCacheRepository] releaseOutboundPermit error:', err.message);
      return false;
    }
  }
}

const defaultRepoInstance = new EnvironmentCacheRepository();
defaultRepoInstance.EnvironmentCacheRepository = EnvironmentCacheRepository;
defaultRepoInstance.isValidWeatherMeasurements = isValidWeatherMeasurements;
defaultRepoInstance.isValidSoilMeasurements = isValidSoilMeasurements;
defaultRepoInstance.VALID_SOIL_TEXTURES = VALID_SOIL_TEXTURES;

module.exports = defaultRepoInstance;
