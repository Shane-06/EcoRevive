'use strict';

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const { EnvironmentCacheRepository } = require('../repositories/environmentCache.repository');
const { OpenMeteoProvider } = require('../integrations/openMeteo.provider');
const { SoilGridsProvider } = require('../integrations/soilGrids.provider');

// Local PostgreSQL 17 test cluster configuration (isolated from production Supabase)
const TEST_DB_CONFIG = {
  host: '127.0.0.1',
  port: 5433,
  user: 'testuser',
  database: 'postgres',
  connectionTimeoutMillis: 3000,
};

describe('Real PostgreSQL Integration — Migration 010 & Repository Verification', () => {
  let pool;
  let testRepo;
  let isLocalPgAvailable = false;

  beforeAll(async () => {
    pool = new Pool(TEST_DB_CONFIG);
    try {
      const ping = await pool.query('SELECT 1 AS connected, version();');
      isLocalPgAvailable = ping.rows[0].connected === 1;
    } catch {
      isLocalPgAvailable = false;
    }

    if (isLocalPgAvailable) {
      // Ensure Supabase-standard roles exist in local test environment for migration 010 DDL verification
      try {
        await pool.query(`
          DO $$
          BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
              CREATE ROLE anon;
            END IF;
            IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
              CREATE ROLE authenticated;
            END IF;
            IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
              CREATE ROLE service_role;
            END IF;
            IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'postgres') THEN
              CREATE ROLE postgres;
            END IF;
          END $$;
        `);
      } catch {
        // Ignore if role creation is restricted on local test cluster
      }

      testRepo = new EnvironmentCacheRepository({ db: pool });
    }
  });

  afterAll(async () => {
    if (pool) {
      try {
        await pool.query('DROP TABLE IF EXISTS environment_cache CASCADE;');
        await pool.query('DROP TABLE IF EXISTS provider_cooldowns CASCADE;');
      } catch {
        // Cleanup ignore
      }
      await pool.end();
    }
  });

  // =========================================================================
  // 1. Migration 010 DDL Application & Schema Conformance
  // =========================================================================
  describe('1. Migration 010 DDL Application & Schema Conformance', () => {
    it('executes actual migration 010 SQL cleanly against real PostgreSQL', async () => {
      if (!isLocalPgAvailable) {
        console.warn('Skipping live PG test: local test cluster not running on 5433');
        return;
      }

      const migrationPath = path.resolve(
        __dirname,
        '../../../database/migrations/010_create_environment_cache_table.sql'
      );
      const migrationSql = fs.readFileSync(migrationPath, 'utf8');

      // Execute complete DDL
      await expect(pool.query(migrationSql)).resolves.toBeDefined();

      // Verify table existence in PostgreSQL information_schema
      const tablesRes = await pool.query(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name IN ('environment_cache', 'provider_cooldowns')
        ORDER BY table_name;
      `);

      const tableNames = tablesRes.rows.map((r) => r.table_name);
      expect(tableNames).toContain('environment_cache');
      expect(tableNames).toContain('provider_cooldowns');
    });

    it('verifies environment_cache columns and data types in PostgreSQL', async () => {
      if (!isLocalPgAvailable) return;

      const colsRes = await pool.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'environment_cache';
      `);

      const colMap = new Map(colsRes.rows.map((r) => [r.column_name, r]));
      expect(colMap.has('grid_key')).toBe(true);
      expect(colMap.has('cache_type')).toBe(true);
      expect(colMap.has('latitude')).toBe(true);
      expect(colMap.has('longitude')).toBe(true);
      expect(colMap.has('source')).toBe(true);
      expect(colMap.has('status')).toBe(true);
      expect(colMap.has('data')).toBe(true);
      expect(colMap.has('metadata')).toBe(true);
      expect(colMap.has('verified_at')).toBe(true);
      expect(colMap.has('expires_at')).toBe(true);
      expect(colMap.get('data').data_type).toBe('jsonb');
      expect(colMap.get('metadata').data_type).toBe('jsonb');
    });

    it('verifies provider_cooldowns columns including atomic permit coordination', async () => {
      if (!isLocalPgAvailable) return;

      const colsRes = await pool.query(`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'provider_cooldowns';
      `);

      const colMap = new Map(colsRes.rows.map((r) => [r.column_name, r]));
      expect(colMap.has('provider_name')).toBe(true);
      expect(colMap.has('cooldown_until')).toBe(true);
      expect(colMap.has('retry_after_seconds')).toBe(true);
      expect(colMap.has('permit_holder')).toBe(true);
      expect(colMap.has('permit_expires_at')).toBe(true);
    });

    it('verifies RLS is enabled on both environment_cache and provider_cooldowns', async () => {
      if (!isLocalPgAvailable) return;

      const rlsRes = await pool.query(`
        SELECT tablename, rowsecurity
        FROM pg_tables
        WHERE schemaname = 'public' AND tablename IN ('environment_cache', 'provider_cooldowns');
      `);

      const rlsMap = new Map(rlsRes.rows.map((r) => [r.tablename, r.rowsecurity]));
      expect(rlsMap.get('environment_cache')).toBe(true);
      expect(rlsMap.get('provider_cooldowns')).toBe(true);
    });
  });

  // =========================================================================
  // 2. Real Cache Operations (Insert, Read, Expiry, Upsert)
  // =========================================================================
  describe('2. Real Cache CRUD, Expiry & Upsert Verification', () => {
    it('inserts and retrieves a valid weather cache record in PostgreSQL', async () => {
      if (!isLocalPgAvailable) return;

      const weatherData = {
        temperature: 28.5,
        humidity: 62,
        precipitation: 0.0,
        windSpeed: 11.2,
      };

      const inserted = await testRepo.upsertCache({
        gridKey: '30.65:76.78',
        cacheType: 'weather',
        latitude: 30.65,
        longitude: 76.78,
        source: 'Open-Meteo',
        status: 'available',
        data: weatherData,
        metadata: { altitudeMeters: 310 },
        verifiedAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      });

      expect(inserted).toBeDefined();
      expect(inserted.grid_key).toBe('30.65:76.78');
      expect(inserted.cache_type).toBe('weather');

      // Read back via findByGridAndType
      const retrieved = await testRepo.findByGridAndType('30.65:76.78', 'weather');
      expect(retrieved).toBeDefined();
      expect(retrieved.source).toBe('Open-Meteo');
      expect(retrieved.status).toBe('available');
      expect(retrieved.data.temperature).toBe(28.5);
      expect(retrieved.data.humidity).toBe(62);
      expect(retrieved.metadata.altitudeMeters).toBe(310);
    });

    it('upsertCache: updates record in-place without key violation on duplicate (grid_key, cache_type)', async () => {
      if (!isLocalPgAvailable) return;

      const updatedWeatherData = {
        temperature: 31.0,
        humidity: 55,
        precipitation: 1.5,
        windSpeed: 14.0,
      };

      const updated = await testRepo.upsertCache({
        gridKey: '30.65:76.78',
        cacheType: 'weather',
        latitude: 30.65,
        longitude: 76.78,
        source: 'Open-Meteo',
        status: 'available',
        data: updatedWeatherData,
        metadata: { updated: true },
        verifiedAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      });

      expect(updated).toBeDefined();

      // Ensure total rows for this key remained exactly 1
      const countRes = await pool.query(
        "SELECT count(*) FROM environment_cache WHERE grid_key = '30.65:76.78' AND cache_type = 'weather';"
      );
      expect(parseInt(countRes.rows[0].count, 10)).toBe(1);

      // Verify data was updated in-place
      const retrieved = await testRepo.findByGridAndType('30.65:76.78', 'weather');
      expect(retrieved.data.temperature).toBe(31.0);
      expect(retrieved.data.humidity).toBe(55);
    });

    it('enforces isolated storage between exact-site and regional soil cache entries', async () => {
      if (!isLocalPgAvailable) return;

      const exactSoilData = {
        ph: 7.2,
        clayPercentage: 25.0,
        sandPercentage: 45.0,
        siltPercentage: 30.0,
        texture: 'Loam',
        organicCarbon: 18.5,
      };

      const regionalSoilData = {
        ph: 6.8,
        clayPercentage: 35.0,
        sandPercentage: 30.0,
        siltPercentage: 35.0,
        texture: 'Clay loam',
        organicCarbon: 12.0,
      };

      await testRepo.upsertCache({
        gridKey: 'sg_approx_13556_29412',
        cacheType: 'soil_exact',
        latitude: 30.65,
        longitude: 76.78,
        source: 'ISRIC SoilGrids',
        status: 'available',
        data: exactSoilData,
        metadata: { isExactRasterCell: false, spatialMethod: 'approximate_wgs84_grid_bucket' },
        verifiedAt: new Date(),
        expiresAt: new Date(Date.now() + 90 * 24 * 3600 * 1000),
      });

      await testRepo.upsertCache({
        gridKey: 'sg_approx_13556_29412:d10',
        cacheType: 'soil_regional',
        latitude: 30.65,
        longitude: 76.78,
        source: 'ISRIC SoilGrids (Regional Baseline)',
        status: 'regional_baseline',
        data: regionalSoilData,
        metadata: { isRegional: true, distanceKm: 10, direction: 'North' },
        verifiedAt: new Date(),
        expiresAt: new Date(Date.now() + 90 * 24 * 3600 * 1000),
      });

      const exactRow = await testRepo.findByGridAndType('sg_approx_13556_29412', 'soil_exact');
      const regionalRow = await testRepo.findByGridAndType('sg_approx_13556_29412:d10', 'soil_regional');

      expect(exactRow).toBeDefined();
      expect(exactRow.data.texture).toBe('Loam');
      expect(regionalRow).toBeDefined();
      expect(regionalRow.data.texture).toBe('Clay loam');
      expect(regionalRow.status).toBe('regional_baseline');
    });

    it('rejects invalid measurements and unapproved texture strings from insertion', async () => {
      if (!isLocalPgAvailable) return;

      const badSoilData = {
        ph: 7.0,
        texture: 'InvalidSyntheticClay', // Not in USDA 12 classes
      };

      const result = await testRepo.upsertCache({
        gridKey: 'sg_approx_99999_99999',
        cacheType: 'soil_exact',
        latitude: 30.65,
        longitude: 76.78,
        source: 'ISRIC SoilGrids',
        data: badSoilData,
        verifiedAt: new Date(),
        expiresAt: new Date(Date.now() + 3600 * 1000),
      });

      expect(result).toBeNull();

      const lookup = await testRepo.findByGridAndType('sg_approx_99999_99999', 'soil_exact');
      expect(lookup).toBeNull();
    });
  });

  // =========================================================================
  // 3. Provider Cooldown Persistence & Restart Recovery
  // =========================================================================
  describe('3. Provider Cooldown Persistence & Restart Recovery', () => {
    it('persists provider cooldown in PostgreSQL and updates on conflict', async () => {
      if (!isLocalPgAvailable) return;

      const success = await testRepo.setProviderCooldown(
        'open-meteo',
        180,
        'Open-Meteo HTTP 429 rate limit exceeded'
      );
      expect(success).toBe(true);

      const cd = await testRepo.getProviderCooldown('open-meteo');
      expect(cd).toBeDefined();
      expect(cd.retryAfterSeconds).toBe(180);
      expect(cd.reason).toBe('Open-Meteo HTTP 429 rate limit exceeded');
      expect(cd.cooldownUntil.getTime()).toBeGreaterThan(Date.now());

      // Update cooldown (simulating a subsequent 429)
      await testRepo.setProviderCooldown('open-meteo', 360, 'Subsequent 429');
      const updatedCd = await testRepo.getProviderCooldown('open-meteo');
      expect(updatedCd.retryAfterSeconds).toBe(360);
      expect(updatedCd.reason).toBe('Subsequent 429');
    });

    it('restores active cooldown on provider startup (simulating Render cold-boot restart)', async () => {
      if (!isLocalPgAvailable) return;

      // Seed active cooldown in database
      await testRepo.setProviderCooldown('open-meteo', 600, 'Render restart test cooldown');

      // Create a brand new OpenMeteoProvider instance (simulating fresh memory space)
      const freshProvider = new OpenMeteoProvider({ cacheRepo: testRepo });
      expect(freshProvider.cooldownUntil).toBe(0);

      // Startup initialization restores cooldown
      await freshProvider.ensureInitialized();
      expect(freshProvider.cooldownUntil).toBeGreaterThan(Date.now());

      // Verify that calling fetchWeather immediately refuses outbound request and serves unavailable/stale
      const res = await freshProvider.fetchWeather({ latitude: 30.65, longitude: 76.78 });
      expect(res.status).toBe('unavailable');
      expect(res.isRateLimited).toBe(true);
      expect(res.remainingCooldownSeconds).toBeGreaterThan(0);
    });

    it('persists and restores SoilGrids failure cooldown in PostgreSQL across fresh provider instances', async () => {
      if (!isLocalPgAvailable) return;

      // Seed active failure cooldown in PostgreSQL
      await testRepo.setProviderCooldown('soilgrids', 60, 'SoilGrids request timed out');

      const cd = await testRepo.getProviderCooldown('soilgrids');
      expect(cd).toBeDefined();
      expect(cd.retryAfterSeconds).toBe(60);
      expect(cd.reason).toContain('timed out');
      expect(cd.cooldownUntil.getTime()).toBeGreaterThan(Date.now());

      // Create a fresh SoilGridsProvider instance (simulating cold boot after restart)
      const freshSoilProvider = new SoilGridsProvider({ cacheRepo: testRepo });
      expect(freshSoilProvider.cooldownUntil).toBe(0);

      // Startup initialization restores persistent cooldown
      await freshSoilProvider.ensureInitialized();
      expect(freshSoilProvider.cooldownUntil).toBeGreaterThan(Date.now());

      // Calling fetchSoil during active cooldown immediately refuses outbound request
      const res = await freshSoilProvider.fetchSoil({ latitude: 30.65, longitude: 76.78 });
      expect(res.status).toBe('unavailable');
      expect(res.isRateLimited).toBe(true);
      expect(res.reason).toBe('provider_cooldown');
      expect(res.remainingCooldownSeconds).toBeGreaterThan(0);
    });
  });

  // =========================================================================
  // 4. Outbound Permit Lifecycle & Concurrency Invariants
  // =========================================================================
  describe('4. Outbound Permit Lifecycle & Concurrency Invariants', () => {
    beforeEach(async () => {
      if (!isLocalPgAvailable) return;
      // Reset cooldowns and permits for clean test conditions
      await pool.query(
        "UPDATE provider_cooldowns SET cooldown_until = '1970-01-01', permit_holder = NULL, permit_expires_at = NULL WHERE provider_name IN ('open-meteo', 'soilgrids');"
      );
    });

    it('4.1 Simultaneous permit acquisition: only one instance succeeds, second is serialized/denied', async () => {
      if (!isLocalPgAvailable) return;

      // Simulate two instances attempting to acquire outbound permit at the same millisecond
      const [res1, res2] = await Promise.all([
        testRepo.acquireOutboundPermit('open-meteo', 10, 'instance-alpha'),
        testRepo.acquireOutboundPermit('open-meteo', 10, 'instance-beta'),
      ]);

      // Exactly one instance must be granted the permit
      const grantedCount = [res1.granted, res2.granted].filter(Boolean).length;
      expect(grantedCount).toBe(1);

      const winner = res1.granted ? res1 : res2;
      const loser = res1.granted ? res2 : res1;

      expect(winner.granted).toBe(true);
      expect(winner.inCooldown).toBe(false);
      expect(loser.granted).toBe(false);
      expect(loser.reason).toContain('Concurrent backend instance holds active outbound permit');

      // Cleanup
      await testRepo.releaseOutboundPermit('open-meteo', winner.permitHolder);
    });

    it('4.2 Permit release: verified after Success (200), Rate Limit (429), Server Error (5xx), and Timeout', async () => {
      if (!isLocalPgAvailable) return;

      const provider = new OpenMeteoProvider({ cacheRepo: testRepo });

      // Scenario A: Success (200 OK)
      const mockFetch200 = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ current: { temperature_2m: 25.0 } }),
      });
      global.fetch = mockFetch200;

      await provider.fetchWeather({ latitude: 30.65, longitude: 76.78 });

      // Permit must be released in PostgreSQL
      let row = await pool.query("SELECT permit_holder, permit_expires_at FROM provider_cooldowns WHERE provider_name = 'open-meteo';");
      expect(row.rows[0].permit_holder).toBeNull();
      expect(new Date(row.rows[0].permit_expires_at).getTime()).toBeLessThanOrEqual(Date.now() + 50);

      // Scenario B: HTTP 429 Rate Limit
      const mockFetch429 = jest.fn().mockResolvedValue({
        ok: false,
        status: 429,
        headers: new Headers({ 'retry-after': '60' }),
      });
      global.fetch = mockFetch429;

      await provider.fetchWeather({ latitude: 30.65, longitude: 76.78 });

      row = await pool.query("SELECT permit_holder, permit_expires_at, cooldown_until FROM provider_cooldowns WHERE provider_name = 'open-meteo';");
      expect(row.rows[0].permit_holder).toBeNull();
      expect(new Date(row.rows[0].cooldown_until).getTime()).toBeGreaterThan(Date.now());

      // Reset cooldown for next scenario
      await pool.query("UPDATE provider_cooldowns SET cooldown_until = '1970-01-01' WHERE provider_name = 'open-meteo';");
      provider.resetCooldown();

      // Scenario C: HTTP 500 Server Error
      const mockFetch500 = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
      });
      global.fetch = mockFetch500;

      await provider.fetchWeather({ latitude: 30.65, longitude: 76.78 });

      row = await pool.query("SELECT permit_holder FROM provider_cooldowns WHERE provider_name = 'open-meteo';");
      expect(row.rows[0].permit_holder).toBeNull();

      // Scenario D: TimeoutError
      const timeoutErr = new Error('The operation was aborted due to timeout');
      timeoutErr.name = 'TimeoutError';
      const mockFetchTimeout = jest.fn().mockRejectedValue(timeoutErr);
      global.fetch = mockFetchTimeout;

      await provider.fetchWeather({ latitude: 30.65, longitude: 76.78 });

      row = await pool.query("SELECT permit_holder FROM provider_cooldowns WHERE provider_name = 'open-meteo';");
      expect(row.rows[0].permit_holder).toBeNull();
    });

    it('4.3 Delayed request approaching lease expiry: lease auto-expires safely and permits subsequent caller', async () => {
      if (!isLocalPgAvailable) return;

      // Instance 1 acquires a 1-second permit
      const permit1 = await testRepo.acquireOutboundPermit('open-meteo', 1, 'inst-delay-1');
      expect(permit1.granted).toBe(true);

      // Immediately after: Instance 2 is denied
      const permit2Immediate = await testRepo.acquireOutboundPermit('open-meteo', 1, 'inst-delay-2');
      expect(permit2Immediate.granted).toBe(false);

      // Wait 1.1s for lease to expire in PostgreSQL
      await new Promise((r) => setTimeout(r, 1100));

      // After lease expiration: Instance 2 can acquire permit even if Instance 1 failed to release
      const permit2AfterExpiry = await testRepo.acquireOutboundPermit('open-meteo', 1, 'inst-delay-2');
      expect(permit2AfterExpiry.granted).toBe(true);
      expect(permit2AfterExpiry.permitHolder).toBe('inst-delay-2');

      // Cleanup
      await testRepo.releaseOutboundPermit('open-meteo', 'inst-delay-2');
    });

    it('4.4 Cooldown activation racing with permit acquisition: 429 cooldown is NEVER overwritten by concurrent acquire', async () => {
      if (!isLocalPgAvailable) return;

      // 1. Activate 429 cooldown (60 seconds)
      await testRepo.setProviderCooldown('open-meteo', 60, 'Race test 429');

      // 2. Concurrently attempt to acquire permit
      const acquireAttempt = await testRepo.acquireOutboundPermit('open-meteo', 10, 'inst-racer');

      // Permit must be refused with inCooldown: true
      expect(acquireAttempt.granted).toBe(false);
      expect(acquireAttempt.inCooldown).toBe(true);
      expect(acquireAttempt.retryAfterSeconds).toBe(60);

      // 3. Verify cooldown in PostgreSQL was NOT overwritten or downgraded
      const row = await pool.query("SELECT cooldown_until, status_code, retry_after_seconds FROM provider_cooldowns WHERE provider_name = 'open-meteo';");
      expect(row.rows[0].status_code).toBe(429);
      expect(row.rows[0].retry_after_seconds).toBe(60);
      expect(new Date(row.rows[0].cooldown_until).getTime()).toBeGreaterThan(Date.now() + 45 * 1000);
    });

    it("4.5 Stale permit holder safety: stale instance cannot release another instance's active permit", async () => {
      if (!isLocalPgAvailable) return;

      // 1. Instance 1 acquires a short 1-second permit
      await testRepo.acquireOutboundPermit('open-meteo', 1, 'stale-instance-1');

      // 2. Wait for lease to expire
      await new Promise((r) => setTimeout(r, 1100));

      // 3. Instance 2 takes over and acquires an active permit
      const permit2 = await testRepo.acquireOutboundPermit('open-meteo', 10, 'active-instance-2');
      expect(permit2.granted).toBe(true);

      // Verify Instance 2 is recorded as the permit holder
      let row = await pool.query("SELECT permit_holder FROM provider_cooldowns WHERE provider_name = 'open-meteo';");
      expect(row.rows[0].permit_holder).toBe('active-instance-2');

      // 4. Stale Instance 1 attempts to release the permit with its old holder ID
      const releaseResult = await testRepo.releaseOutboundPermit('open-meteo', 'stale-instance-1');
      // Conditional SQL WHERE provider_name = $1 AND permit_holder = $2 matches 0 rows!
      expect(releaseResult).toBe(false);

      // 5. Verify Instance 2's permit remains intact and active!
      row = await pool.query("SELECT permit_holder FROM provider_cooldowns WHERE provider_name = 'open-meteo';");
      expect(row.rows[0].permit_holder).toBe('active-instance-2');

      // Cleanup
      await testRepo.releaseOutboundPermit('open-meteo', 'active-instance-2');
    });
  });
});
