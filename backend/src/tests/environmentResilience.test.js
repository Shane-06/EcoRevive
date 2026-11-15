'use strict';

const config = require('../config');
const environmentCacheRepo = require('../repositories/environmentCache.repository');
const { isValidWeatherMeasurements, isValidSoilMeasurements } = require('../repositories/environmentCache.repository');
const openMeteoProvider = require('../integrations/openMeteo.provider');
const { OpenMeteoProvider } = openMeteoProvider;
const soilGridsProvider = require('../integrations/soilGrids.provider');
const { SoilGridsProvider } = soilGridsProvider;
const environmentService = require('../services/environment.service');
const { EnvironmentService } = environmentService;
const { evaluateWater, SUITABILITY_STATUS } = require('../services/suitability.rules');
const db = require('../config/db');

describe('Environmental Assessment Resilience & Persistence Tests', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('1. Measurement Validation Safeguards (isValidWeatherMeasurements & isValidSoilMeasurements)', () => {
    it('should validate complete, physiologically plausible weather measurements', () => {
      const validWeather = {
        temperature: 28.5,
        humidity: 65,
        precipitation: 1.2,
        windSpeed: 12.0,
      };
      expect(isValidWeatherMeasurements(validWeather)).toBe(true);
    });

    it('should reject weather with missing or null physical values', () => {
      expect(isValidWeatherMeasurements(null)).toBe(false);
      expect(isValidWeatherMeasurements({})).toBe(false);
      expect(isValidWeatherMeasurements({ temperature: null, humidity: 50, precipitation: 0, windSpeed: 5 })).toBe(false);
      expect(isValidWeatherMeasurements({ temperature: 25, humidity: null, precipitation: 0, windSpeed: 5 })).toBe(false);
      expect(isValidWeatherMeasurements({ temperature: 25, humidity: 50, precipitation: null, windSpeed: 5 })).toBe(false);
      expect(isValidWeatherMeasurements({ temperature: 25, humidity: 50, precipitation: 0, windSpeed: null })).toBe(false);
    });

    it('should reject out-of-bounds weather measurements', () => {
      expect(isValidWeatherMeasurements({ temperature: 75, humidity: 50, precipitation: 0, windSpeed: 5 })).toBe(false); // >65°C
      expect(isValidWeatherMeasurements({ temperature: -70, humidity: 50, precipitation: 0, windSpeed: 5 })).toBe(false); // <-60°C
      expect(isValidWeatherMeasurements({ temperature: 25, humidity: 105, precipitation: 0, windSpeed: 5 })).toBe(false); // >100%
      expect(isValidWeatherMeasurements({ temperature: 25, humidity: -5, precipitation: 0, windSpeed: 5 })).toBe(false); // <0%
      expect(isValidWeatherMeasurements({ temperature: 25, humidity: 50, precipitation: -1, windSpeed: 5 })).toBe(false); // <0mm
      expect(isValidWeatherMeasurements({ temperature: 25, humidity: 50, precipitation: 0, windSpeed: -2 })).toBe(false); // <0km/h
    });

    it('should validate complete, plausible soil measurements', () => {
      const validSoil = {
        ph: 7.2,
        clayPercentage: 22.0,
        sandPercentage: 45.0,
        siltPercentage: 33.0,
        texture: 'Loam',
        organicCarbon: 14.5,
      };
      expect(isValidSoilMeasurements(validSoil)).toBe(true);
    });

    it('should validate partially populated soil response if at least one valid measurement is present', () => {
      // Partially populated valid profile with unclassified texture
      const partialSoil = {
        ph: 7.2,
        clayPercentage: null,
        sandPercentage: null,
        siltPercentage: null,
        texture: null,
        organicCarbon: 12.0,
      };
      expect(isValidSoilMeasurements(partialSoil)).toBe(true);
    });

    it('should reject all-null urban mask responses and empty objects', () => {
      const urbanMaskNoData = {
        ph: null,
        clayPercentage: null,
        sandPercentage: null,
        siltPercentage: null,
        texture: null,
        organicCarbon: null,
      };
      expect(isValidSoilMeasurements(urbanMaskNoData)).toBe(false);
      expect(isValidSoilMeasurements(null)).toBe(false);
      expect(isValidSoilMeasurements({})).toBe(false);
    });

    it('should reject invalid soil texture classes and unapproved texture strings', () => {
      expect(isValidSoilMeasurements({ ph: 7.0, texture: 'Plastic' })).toBe(false);
      expect(isValidSoilMeasurements({ ph: 7.0, texture: 'NotATexture' })).toBe(false);
      expect(isValidSoilMeasurements({ ph: 7.0, texture: 'Loam' })).toBe(true);
      expect(isValidSoilMeasurements({ ph: 7.0, texture: 'Sandy clay loam' })).toBe(true);
    });

    it('should reject extreme or physically impossible soil values and organic carbon', () => {
      expect(isValidSoilMeasurements({ ph: 1.5, texture: 'Loam' })).toBe(false); // pH < 2.0
      expect(isValidSoilMeasurements({ ph: 13.0, texture: 'Loam' })).toBe(false); // pH > 12.0
      expect(isValidSoilMeasurements({ ph: 7.0, clayPercentage: 110, texture: 'Clay' })).toBe(false); // clay > 100%
      expect(isValidSoilMeasurements({ ph: 7.0, clayPercentage: -5, texture: 'Loam' })).toBe(false); // clay < 0%
      expect(isValidSoilMeasurements({ ph: 7.0, organicCarbon: -2.0, texture: 'Loam' })).toBe(false); // soc < 0
      expect(isValidSoilMeasurements({ ph: 7.0, organicCarbon: 1500, texture: 'Loam' })).toBe(false); // soc > 1000 g/kg
      expect(isValidSoilMeasurements({ ph: 7.0, organicCarbon: 25.0, texture: 'Loam' })).toBe(true); // valid soc
    });
  });

  describe('2. EnvironmentCacheRepository Parameterization & Safety', () => {
    it('upsertCache: should reject invalid weather payload without executing SQL query', async () => {
      const querySpy = jest.spyOn(db, 'query');
      const result = await environmentCacheRepo.upsertCache({
        gridKey: '30.65:76.78',
        cacheType: 'weather',
        latitude: 30.65,
        longitude: 76.78,
        source: 'Open-Meteo',
        data: { temperature: null }, // Invalid
        verifiedAt: new Date(),
        expiresAt: new Date(),
      });
      expect(result).toBeNull();
      expect(querySpy).not.toHaveBeenCalled();
    });

    it('upsertCache: should reject invalid / all-null urban soil payload without executing SQL query', async () => {
      const querySpy = jest.spyOn(db, 'query');
      const result = await environmentCacheRepo.upsertCache({
        gridKey: 'c13556:29412',
        cacheType: 'soil_exact',
        latitude: 30.65,
        longitude: 76.78,
        source: 'ISRIC SoilGrids',
        data: { ph: null, clayPercentage: null, texture: null }, // Urban mask NoData
        verifiedAt: new Date(),
        expiresAt: new Date(),
      });
      expect(result).toBeNull();
      expect(querySpy).not.toHaveBeenCalled();
    });

    it('upsertCache: should invoke parameterized query with validated payload', async () => {
      const mockRow = { id: 1, grid_key: '30.65:76.78', cache_type: 'weather' };
      const querySpy = jest.spyOn(db, 'query').mockResolvedValueOnce({ rows: [mockRow] });

      const verifiedAt = new Date('2026-11-12T12:00:00Z');
      const expiresAt = new Date('2026-11-12T12:30:00Z');
      const validData = { temperature: 29.4, humidity: 60, precipitation: 0, windSpeed: 10 };

      const res = await environmentCacheRepo.upsertCache({
        gridKey: '30.65:76.78',
        cacheType: 'weather',
        latitude: 30.65,
        longitude: 76.78,
        source: 'Open-Meteo',
        status: 'available',
        data: validData,
        metadata: { provider: 'test' },
        verifiedAt,
        expiresAt,
      });

      expect(res).toEqual(mockRow);
      expect(querySpy).toHaveBeenCalledTimes(1);
      const [sql, params] = querySpy.mock.calls[0];
      expect(sql).toContain('INSERT INTO environment_cache');
      expect(sql).toContain('ON CONFLICT (grid_key, cache_type) DO UPDATE');
      expect(params[0]).toBe('30.65:76.78');
      expect(params[1]).toBe('weather');
      expect(params[2]).toBe(30.65);
      expect(params[3]).toBe(76.78);
      expect(params[4]).toBe('Open-Meteo');
      expect(params[5]).toBe('available');
      expect(params[6]).toBe(JSON.stringify(validData));
      expect(params[7]).toBe(JSON.stringify({ provider: 'test' }));
      expect(params[8]).toEqual(verifiedAt);
      expect(params[9]).toEqual(expiresAt);
    });

    it('setProviderCooldown: should safely bound retry-after seconds and use parameterized SQL', async () => {
      const querySpy = jest.spyOn(db, 'query').mockResolvedValue({ rows: [] });

      // Test case A: Excessive retry-after (999,999s) bounded to 86,400s (24h)
      await environmentCacheRepo.setProviderCooldown('open-meteo', 999999, 'Excessive cooldown test');
      expect(querySpy).toHaveBeenCalledTimes(1);
      let [sql, params] = querySpy.mock.calls[0];
      expect(sql).toContain('INSERT INTO provider_cooldowns');
      expect(sql).not.toContain('999999'); // No dynamic SQL interval interpolation
      expect(params[0]).toBe('open-meteo');
      expect(params[1]).toBeInstanceOf(Date);
      expect(params[2]).toBe(86400); // Bounded to max 24h
      expect(params[3]).toBe('Excessive cooldown test');

      // Test case B: Zero or negative retry-after bounded to 1s
      querySpy.mockClear();
      await environmentCacheRepo.setProviderCooldown('open-meteo', -50, 'Negative cooldown test');
      [sql, params] = querySpy.mock.calls[0];
      expect(params[2]).toBe(1); // Bounded to min 1s
    });

    it('getProviderCooldown: should retrieve active cooldown date and seconds', async () => {
      const futureDate = new Date(Date.now() + 1800 * 1000);
      jest.spyOn(db, 'query').mockResolvedValueOnce({
        rows: [
          {
            cooldown_until: futureDate.toISOString(),
            status_code: 429,
            retry_after_seconds: 1800,
            reason: 'Rate limit exceeded',
          },
        ],
      });

      const cd = await environmentCacheRepo.getProviderCooldown('open-meteo');
      expect(cd).not.toBeNull();
      expect(cd.cooldownUntil.getTime()).toBeCloseTo(futureDate.getTime(), -2);
      expect(cd.retryAfterSeconds).toBe(1800);
      expect(cd.reason).toBe('Rate limit exceeded');
    });
  });

  describe('3. Open-Meteo Provider Cooldown Persistence & Startup Flow', () => {
    it('ensureInitialized: should load persisted cooldown on startup and prevent outbound calls', async () => {
      const futureCooldownMs = Date.now() + 3600 * 1000;
      const mockRepo = {
        getProviderCooldown: jest.fn().mockResolvedValue({
          cooldownUntil: new Date(futureCooldownMs),
          retryAfterSeconds: 3600,
        }),
        setProviderCooldown: jest.fn(),
      };

      const provider = new OpenMeteoProvider({ cacheRepo: mockRepo });
      expect(provider.initialized).toBe(false);

      const fetchSpy = jest.spyOn(global, 'fetch');
      const result = await provider.fetchWeather({ latitude: 30.65, longitude: 76.78 });

      expect(provider.initialized).toBe(true);
      expect(mockRepo.getProviderCooldown).toHaveBeenCalledWith('open-meteo');
      expect(fetchSpy).not.toHaveBeenCalled(); // Blocked by persistent cooldown
      expect(result.status).toBe('unavailable');
      expect(result.isRateLimited).toBe(true);
      expect(result.remainingCooldownSeconds).toBeGreaterThan(3500);
    });

    it('should retain in-memory cooldown if database query fails during setProviderCooldown', async () => {
      const mockRepo = {
        getProviderCooldown: jest.fn().mockResolvedValue(null),
        setProviderCooldown: jest.fn().mockRejectedValue(new Error('DB connection pool exhausted')),
      };

      const provider = new OpenMeteoProvider({ cacheRepo: mockRepo });

      // Mock 429 response from Open-Meteo
      const mock429Response = {
        ok: false,
        status: 429,
        headers: new Headers({ 'retry-after': '120' }),
      };
      const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValueOnce(mock429Response);

      const result = await provider.fetchWeather({ latitude: 30.65, longitude: 76.78 });

      expect(mockRepo.setProviderCooldown).toHaveBeenCalled();
      expect(provider.getCooldownUntil()).toBeGreaterThan(Date.now());
      expect(result.status).toBe('unavailable');
      expect(result.isRateLimited).toBe(true);
      expect(result.remainingCooldownSeconds).toBe(120);

      // Verify that subsequent call is blocked in-memory without network request
      fetchSpy.mockClear();
      const secondResult = await provider.fetchWeather({ latitude: 30.65, longitude: 76.78 });
      expect(fetchSpy).not.toHaveBeenCalled();
      expect(secondResult.isRateLimited).toBe(true);
    });

    it('parseRetryAfter: safely parses integer, date header, and bounds values [1s, 86400s]', () => {
      const provider = new OpenMeteoProvider();

      expect(provider.parseRetryAfter(new Headers({ 'retry-after': '300' }))).toBe(300);
      expect(provider.parseRetryAfter(new Headers({ 'retry-after': '0' }))).toBe(60); // fallback
      expect(provider.parseRetryAfter(new Headers({ 'retry-after': '120000' }))).toBe(86400); // capped at 24h
      expect(provider.parseRetryAfter(new Headers())).toBe(60); // default
    });

    it('coalesces concurrent cold-boot ensureInitialized() calls into a single database query', async () => {
      let resolveDb;
      const delayedDb = new Promise((resolve) => {
        resolveDb = resolve;
      });

      const mockRepo = {
        getProviderCooldown: jest.fn().mockImplementation(() => delayedDb),
      };

      const provider = new OpenMeteoProvider({ cacheRepo: mockRepo });

      // Trigger 4 concurrent calls to ensureInitialized
      const p1 = provider.ensureInitialized();
      const p2 = provider.ensureInitialized();
      const p3 = provider.ensureInitialized();
      const p4 = provider.ensureInitialized();

      resolveDb({
        cooldownUntil: new Date(Date.now() + 60000),
        retryAfterSeconds: 60,
      });

      await Promise.all([p1, p2, p3, p4]);

      expect(mockRepo.getProviderCooldown).toHaveBeenCalledTimes(1);
    });
  });

  describe('4. SoilGrids Approximate Spatial Grid Identification & Transparency', () => {
    it('computeApproxSpatialCell: generates discrete localized WGS84 spatial bucket and explicitly flags isExactRasterCell as false', () => {
      const provider = new SoilGridsProvider();
      const cell1 = provider.computeApproxSpatialCell(30.6500, 76.7800);
      const cellClose = provider.computeApproxSpatialCell(30.6501, 76.7801); // ~14m away, same bucket
      const cellFar = provider.computeApproxSpatialCell(30.6550, 76.7850); // ~700m away, different bucket

      expect(cell1.cellKey).toMatch(/^c\d+:\d+$/);
      expect(cellClose.cellKey).toBe(cell1.cellKey); // Must fall into the same nominal spatial bucket
      expect(cellFar.cellKey).not.toBe(cell1.cellKey); // Distinct spatial bucket

      // Scientific integrity: Must NOT claim to be exact SoilGrids raster cells
      expect(cell1.isExactRasterCell).toBe(false);
      expect(cell1.spatialMethod).toBe('approximate_wgs84_grid_bucket');
      expect(cell1.nominalResolution).toContain('250m');
    });

    it('compute250mRasterCell backwards-compatible alias preserves approximate spatial attributes', () => {
      const cell = soilGridsProvider.compute250mRasterCell(30.65, 76.78);
      expect(cell.isExactRasterCell).toBe(false);
      expect(cell.spatialMethod).toBe('approximate_wgs84_grid_bucket');
    });

    it('preserves exact-site vs regional isolation in cache storage keys', async () => {
      const service = new EnvironmentService();
      const cell = service.computeSoilRasterCell(30.65, 76.78);

      expect(cell.cellKey).toMatch(/^c\d+:\d+$/);
      expect(cell.snappedLat).toBeCloseTo(30.65, 2);
      expect(cell.snappedLng).toBeCloseTo(76.78, 2);
      expect(cell.isExactRasterCell).toBe(false);
    });
  });

  describe('5. EnvironmentService L2 Persistence & Bounded Stale Weather Fallbacks', () => {
    it('serves unexpired weather from L2 persistent database cache when L1 is cold', async () => {
      const verifiedAt = new Date('2026-11-12T12:00:00Z');
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // Fresh for 15 more minutes
      const mockWeatherData = {
        temperature: 27.5,
        humidity: 55,
        precipitation: 0.0,
        windSpeed: 8.2,
      };

      const mockRepo = {
        findByGridAndType: jest.fn().mockResolvedValueOnce({
          grid_key: '30.65:76.78',
          cache_type: 'weather',
          source: 'Open-Meteo',
          status: 'available',
          verified_at: verifiedAt.toISOString(),
          expires_at: expiresAt.toISOString(),
          data: mockWeatherData,
        }),
        upsertCache: jest.fn(),
      };

      const mockProvider = {
        ensureInitialized: jest.fn(),
        getCooldownUntil: jest.fn().mockReturnValue(0),
        fetchWeather: jest.fn(),
      };

      const service = new EnvironmentService({
        cacheRepo: mockRepo,
        openMeteoProvider: mockProvider,
      });

      const result = await service.getWeather(30.65, 76.78);

      expect(mockRepo.findByGridAndType).toHaveBeenCalledWith('30.65:76.78', 'weather');
      expect(mockProvider.fetchWeather).not.toHaveBeenCalled(); // Never hit external API!
      expect(result.status).toBe('available');
      expect(result.stale).toBe(false);
      expect(result.data.temperature).toBe(27.5);
    });

    it('serves cached weather within 24 hours as stale when provider is in 429 cooldown', async () => {
      const twoHoursAgo = new Date(Date.now() - 2 * 3600 * 1000);
      const expiredAt = new Date(Date.now() - 1.5 * 3600 * 1000);
      const mockWeatherData = {
        temperature: 28.1,
        humidity: 62,
        precipitation: 0.0,
        windSpeed: 10.0,
      };

      const mockRepo = {
        findByGridAndType: jest.fn().mockResolvedValueOnce({
          grid_key: '30.65:76.78',
          cache_type: 'weather',
          source: 'Open-Meteo',
          status: 'available',
          verified_at: twoHoursAgo.toISOString(),
          expires_at: expiredAt.toISOString(),
          data: mockWeatherData,
        }),
      };

      const mockProvider = {
        ensureInitialized: jest.fn(),
        getCooldownUntil: jest.fn().mockReturnValue(Date.now() + 600 * 1000), // 10 min cooldown active
        fetchWeather: jest.fn(),
      };

      const service = new EnvironmentService({
        cacheRepo: mockRepo,
        openMeteoProvider: mockProvider,
      });

      const result = await service.getWeather(30.65, 76.78);

      expect(mockProvider.fetchWeather).not.toHaveBeenCalled();
      expect(result.status).toBe('available');
      expect(result.stale).toBe(true);
      expect(result.staleAgeHours).toBeCloseTo(2.0, 1);
      expect(result.staleAgeSeconds).toBeGreaterThan(7000);
      expect(result.warning).toContain('Serving cached weather');
      expect(result.data.temperature).toBe(28.1);
    });

    it('marks weather unavailable when cached record exceeds 24-hour max stale limit', async () => {
      const twentySixHoursAgo = new Date(Date.now() - 26 * 3600 * 1000);
      const expiredLongAgo = new Date(Date.now() - 25.5 * 3600 * 1000);
      const mockWeatherData = {
        temperature: 24.0,
        humidity: 70,
        precipitation: 0.0,
        windSpeed: 5.0,
      };

      const mockRepo = {
        findByGridAndType: jest.fn().mockResolvedValueOnce({
          grid_key: '30.65:76.78',
          cache_type: 'weather',
          source: 'Open-Meteo',
          status: 'available',
          verified_at: twentySixHoursAgo.toISOString(),
          expires_at: expiredLongAgo.toISOString(),
          data: mockWeatherData,
        }),
      };

      const mockProvider = {
        ensureInitialized: jest.fn(),
        getCooldownUntil: jest.fn().mockReturnValue(Date.now() + 300 * 1000), // In cooldown
        fetchWeather: jest.fn(),
      };

      const service = new EnvironmentService({
        cacheRepo: mockRepo,
        openMeteoProvider: mockProvider,
      });

      const result = await service.getWeather(30.65, 76.78);

      // Must NOT serve >24h stale data!
      expect(result.status).toBe('unavailable');
      expect(result.data).toBeNull();
      expect(result.isRateLimited).toBe(true);
    });

    it('when serving cached soil for nearby coordinates within same ~250m bucket, explicitly flags as approximate_grid_bucket and attaches nearby warning, never claiming exact-site precision', async () => {
      const verifiedAt = new Date('2026-11-12T12:00:00Z');
      const expiresAt = new Date(Date.now() + 80 * 24 * 3600 * 1000); // 80 days left
      const mockSoilData = {
        ph: 7.2,
        clayPercentage: 22.0,
        sandPercentage: 45.0,
        siltPercentage: 33.0,
        organicCarbon: 14.0,
        texture: 'Loam',
      };

      // Cached observation was taken at 30.6500, 76.7800
      const mockRepo = {
        findByGridAndType: jest.fn().mockResolvedValueOnce({
          grid_key: 'c13556:29412',
          cache_type: 'soil_exact',
          latitude: 30.6500,
          longitude: 76.7800,
          source: 'ISRIC SoilGrids',
          status: 'available',
          verified_at: verifiedAt.toISOString(),
          expires_at: expiresAt.toISOString(),
          data: mockSoilData,
          metadata: { provider: 'ISRIC' },
        }),
      };

      const service = new EnvironmentService({
        cacheRepo: mockRepo,
        soilGridsProvider: {
          compute250mRasterCell: soilGridsProvider.compute250mRasterCell,
          fetchSoil: jest.fn(),
        },
      });

      // Target query is 30.6508, 76.7808 (~120m away within same nominal bucket)
      const result = await service.getSoil(30.6508, 76.7808);

      expect(result.status).toBe('available');
      expect(result.metadata.spatialPrecision).toBe('approximate_grid_bucket');
      expect(result.metadata.isExactRasterCell).toBe(false);
      expect(result.metadata.distanceFromObservedMeters).toBeGreaterThan(50);
      expect(result.warning).toContain('Not an exact-site measurement of the specific point');
      expect(result.metadata.targetLocation).toEqual({ latitude: 30.6508, longitude: 76.7808 });
      expect(result.metadata.sourceLocation).toEqual({ latitude: 30.6500, longitude: 76.7800 });
    });

    it('when serving cached soil for identical coordinates (<15m), flags as same_query_location with no displacement warning', async () => {
      const verifiedAt = new Date('2026-11-12T12:00:00Z');
      const expiresAt = new Date(Date.now() + 80 * 24 * 3600 * 1000);
      const mockSoilData = {
        ph: 7.2,
        clayPercentage: 22.0,
        sandPercentage: 45.0,
        siltPercentage: 33.0,
        organicCarbon: 14.0,
        texture: 'Loam',
      };

      const mockRepo = {
        findByGridAndType: jest.fn().mockResolvedValueOnce({
          grid_key: 'c13556:29412',
          cache_type: 'soil_exact',
          latitude: 30.6500,
          longitude: 76.7800,
          source: 'ISRIC SoilGrids',
          status: 'available',
          verified_at: verifiedAt.toISOString(),
          expires_at: expiresAt.toISOString(),
          data: mockSoilData,
        }),
      };

      const service = new EnvironmentService({
        cacheRepo: mockRepo,
        soilGridsProvider: {
          compute250mRasterCell: soilGridsProvider.compute250mRasterCell,
          fetchSoil: jest.fn(),
        },
      });

      // Exactly identical coordinates
      const result = await service.getSoil(30.6500, 76.7800);

      expect(result.status).toBe('available');
      expect(result.metadata.spatialPrecision).toBe('same_query_location');
      expect(result.metadata.distanceFromObservedMeters).toBe(0);
      expect(result.warning).toBeUndefined();
    });

    it('gracefully handles PostgreSQL cache lookup failure without crashing and falls back to live provider', async () => {
      const mockRepo = {
        findByGridAndType: jest.fn().mockRejectedValue(new Error('PostgreSQL connection terminated unexpectedly')),
        upsertCache: jest.fn().mockRejectedValue(new Error('PostgreSQL write failed')),
      };

      const mockProvider = {
        ensureInitialized: jest.fn().mockResolvedValue(),
        getCooldownUntil: jest.fn().mockReturnValue(0),
        fetchWeather: jest.fn().mockResolvedValue({
          status: 'available',
          source: 'Open-Meteo',
          data: { temperature: 31.0, humidity: 50, precipitation: 0, windSpeed: 12 },
        }),
      };

      const service = new EnvironmentService({
        cacheRepo: mockRepo,
        openMeteoProvider: mockProvider,
      });

      // Must not throw or crash
      const result = await service.getWeather(30.65, 76.78);
      expect(result.status).toBe('available');
      expect(result.data.temperature).toBe(31.0);
    });
  });

  describe('6. Suitability Integrity with Stale Weather Advisories', () => {
    const mockNeemRule = {
      species: 'Neem',
      water_need: 'Low',
      sunlight: 'Full Sun',
    };

    it('evaluates water suitability with advisory notice when weather is cached within 24h', () => {
      const cachedWeather = {
        status: 'available',
        source: 'Open-Meteo',
        verifiedAt: '2026-11-12T10:00:00Z',
        stale: true,
        staleAgeHours: 2.5,
        data: {
          humidity: 45,
          precipitation: 0.0,
        },
      };

      const evalResult = evaluateWater(mockNeemRule, cachedWeather);
      expect(evalResult.status).toBe(SUITABILITY_STATUS.SUITABLE);
      expect(evalResult.reason).toContain('[Advisory: Water suitability estimated from cached weather recorded at');
      expect(evalResult.reason).toContain('2.5h ago');
    });

    it('evaluates sunlight suitability with advisory notice when weather is cached within 24h', () => {
      const cachedWeather = {
        status: 'available',
        source: 'Open-Meteo',
        verifiedAt: '2026-11-12T10:00:00Z',
        stale: true,
        staleAgeHours: 2.0,
        data: {
          condition: 'Partly cloudy',
          weatherCode: 2,
        },
      };

      const { evaluateSunlight } = require('../services/suitability.rules');
      const evalResult = evaluateSunlight(mockNeemRule, cachedWeather);
      expect(evalResult.status).toBe(SUITABILITY_STATUS.SUITABLE);
      expect(evalResult.reason).toContain('[Advisory: Sunlight conditions evaluated from cached weather recorded at');
      expect(evalResult.reason).toContain('2h ago');
    });

    it('returns INSUFFICIENT_DATA when weather is unavailable (>24h or missing)', () => {
      const unavailableWeather = {
        status: 'unavailable',
        source: 'Open-Meteo',
        data: null,
      };

      const evalResult = evaluateWater(mockNeemRule, unavailableWeather);
      expect(evalResult.status).toBe(SUITABILITY_STATUS.INSUFFICIENT_DATA);
      expect(evalResult.reason).toContain('Cannot evaluate water suitability');
    });
  });

  describe('7. In-flight Request Deduplication', () => {
    it('coalesces concurrent weather requests for identical grid key into a single provider invocation', async () => {
      const mockRepo = {
        findByGridAndType: jest.fn().mockResolvedValue(null),
        upsertCache: jest.fn().mockResolvedValue({}),
      };

      let resolveFetch;
      const delayedFetch = new Promise((resolve) => {
        resolveFetch = resolve;
      });

      const mockProvider = {
        ensureInitialized: jest.fn().mockResolvedValue(),
        getCooldownUntil: jest.fn().mockReturnValue(0),
        fetchWeather: jest.fn().mockImplementation(() => delayedFetch),
      };

      const service = new EnvironmentService({
        cacheRepo: mockRepo,
        openMeteoProvider: mockProvider,
      });

      // Fire 5 concurrent requests
      const promises = [
        service.getWeather(30.65, 76.78),
        service.getWeather(30.6501, 76.7802),
        service.getWeather(30.6502, 76.7801),
        service.getWeather(30.65, 76.78),
        service.getWeather(30.6504, 76.7803),
      ];

      // Resolve provider
      resolveFetch({
        status: 'available',
        source: 'Open-Meteo',
        verifiedAt: new Date().toISOString(),
        data: { temperature: 29.0, humidity: 60, precipitation: 0, windSpeed: 10 },
      });

      const results = await Promise.all(promises);

      expect(mockProvider.fetchWeather).toHaveBeenCalledTimes(1);
      expect(results).toHaveLength(5);
      results.forEach((res) => {
        expect(res.status).toBe('available');
        expect(res.data.temperature).toBe(29.0);
      });
    });

    it('coalesces concurrent soil requests for identical nominal bucket into a single provider invocation', async () => {
      const mockRepo = {
        findByGridAndType: jest.fn().mockResolvedValue(null),
        upsertCache: jest.fn().mockResolvedValue({}),
      };

      let resolveSoil;
      const delayedSoil = new Promise((resolve) => {
        resolveSoil = resolve;
      });

      const mockProvider = {
        compute250mRasterCell: soilGridsProvider.compute250mRasterCell,
        fetchSoil: jest.fn().mockImplementation(() => delayedSoil),
      };

      const service = new EnvironmentService({
        cacheRepo: mockRepo,
        soilGridsProvider: mockProvider,
      });

      // Fire 4 concurrent soil requests
      const promises = [
        service.getSoil(30.6500, 76.7800),
        service.getSoil(30.6501, 76.7801),
        service.getSoil(30.6500, 76.7800),
        service.getSoil(30.6501, 76.7801),
      ];

      resolveSoil({
        status: 'available',
        source: 'ISRIC SoilGrids',
        verifiedAt: new Date().toISOString(),
        data: { ph: 7.2, clayPercentage: 22, sandPercentage: 45, siltPercentage: 33, texture: 'Loam' },
      });

      const results = await Promise.all(promises);

      expect(mockProvider.fetchSoil).toHaveBeenCalledTimes(1);
      expect(results).toHaveLength(4);
      results.forEach((res) => {
        expect(res.status).toBe('available');
        expect(res.data.ph).toBe(7.2);
      });
    });
  });

  describe('8. SoilGrids L2 Persistence & Isolation', () => {
    it('persists exact-site soil to L2 cache under 250m cellKey with type soil_exact', async () => {
      const mockRepo = {
        findByGridAndType: jest.fn().mockResolvedValue(null),
        upsertCache: jest.fn().mockResolvedValue({ id: 10 }),
      };

      const mockSoilData = {
        ph: 7.4,
        clayPercentage: 25.0,
        sandPercentage: 40.0,
        siltPercentage: 35.0,
        organicCarbon: 12.0,
        texture: 'Loam',
      };

      const mockSoilProvider = {
        compute250mRasterCell: soilGridsProvider.compute250mRasterCell,
        fetchSoil: jest.fn().mockResolvedValue({
          status: 'available',
          source: 'ISRIC SoilGrids',
          verifiedAt: new Date().toISOString(),
          data: mockSoilData,
        }),
      };

      const service = new EnvironmentService({
        cacheRepo: mockRepo,
        soilGridsProvider: mockSoilProvider,
      });

      const result = await service.getSoil(30.65, 76.78);

      expect(result.status).toBe('available');
      expect(mockRepo.upsertCache).toHaveBeenCalledTimes(1);
      const [upsertArg] = mockRepo.upsertCache.mock.calls[0];
      expect(upsertArg.cacheType).toBe('soil_exact');
      expect(upsertArg.gridKey).toMatch(/^c\d+:\d+$/);
      expect(upsertArg.data).toEqual(mockSoilData);
    });

    it('persists regional baseline under soil_regional cache type and never under exact-site key', async () => {
      const mockRepo = {
        findByGridAndType: jest.fn().mockResolvedValue(null),
        upsertCache: jest.fn().mockResolvedValue({ id: 11 }),
      };

      const mockRegionalSoilData = {
        ph: 6.8,
        clayPercentage: 22.0,
        sandPercentage: 45.0,
        siltPercentage: 33.0,
        organicCarbon: 15.0,
        texture: 'Loam',
      };

      const service = new EnvironmentService({
        cacheRepo: mockRepo,
        soilGridsProvider: {
          compute250mRasterCell: soilGridsProvider.compute250mRasterCell,
          fetchSoil: jest.fn().mockResolvedValue({
            status: 'available',
            source: 'ISRIC SoilGrids',
            data: mockRegionalSoilData,
          }),
        },
      });

      const regionalResult = await service.getRegionalSoilBaseline(30.65, 76.78);

      expect(regionalResult.status).toBe('regional_baseline');
      expect(regionalResult.isRegional).toBe(true);

      const regionalUpserts = mockRepo.upsertCache.mock.calls.filter(
        (call) => call[0].cacheType === 'soil_regional'
      );
      expect(regionalUpserts.length).toBeGreaterThanOrEqual(1);
      expect(regionalUpserts[0][0].gridKey).toContain(':d10');
      expect(regionalUpserts[0][0].cacheType).toBe('soil_regional');
    });
  });

  // =========================================================================
  // 9. SoilGrids Resilience, Failure Cooldown & Stale Fallback Tests
  // =========================================================================
  describe('9. SoilGrids Resilience, Failure Cooldown & Stale Fallback Tests', () => {
    it('persists a 60-second cooldown when SoilGrids request times out', async () => {
      const mockRepo = {
        getProviderCooldown: jest.fn().mockResolvedValue(null),
        acquireOutboundPermit: jest.fn().mockResolvedValue({ granted: true, inCooldown: false }),
        releaseOutboundPermit: jest.fn().mockResolvedValue(true),
        setProviderCooldown: jest.fn().mockResolvedValue(true),
      };

      const timeoutError = new Error('The operation was aborted due to timeout');
      timeoutError.name = 'TimeoutError';
      const mockFetchTimeout = jest.fn().mockRejectedValue(timeoutError);
      global.fetch = mockFetchTimeout;

      const provider = new SoilGridsProvider({
        cacheRepo: mockRepo,
        timeoutMs: 8000,
        failureCooldownSeconds: 60,
      });

      const res = await provider.fetchSoil({ latitude: 30.65, longitude: 76.78 });

      expect(res.status).toBe('unavailable');
      expect(res.reason).toBe('timeout');
      expect(res.error).toBe('Provider request timed out');

      // Verify 60s failure cooldown was persisted to repository
      expect(mockRepo.setProviderCooldown).toHaveBeenCalledTimes(1);
      const [providerName, cooldownSecs, reason] = mockRepo.setProviderCooldown.mock.calls[0];
      expect(providerName).toBe('soilgrids');
      expect(cooldownSecs).toBe(60);
      expect(reason).toContain('timed out');

      // Verify in-memory cooldown was activated
      expect(provider.cooldownUntil).toBeGreaterThan(Date.now());
      // Verify outbound permit was released cleanly
      expect(mockRepo.releaseOutboundPermit).toHaveBeenCalledWith('soilgrids', expect.stringContaining(provider.instanceId));
    });

    it('makes zero additional provider calls during active failure cooldown', async () => {
      const mockRepo = {
        getProviderCooldown: jest.fn().mockResolvedValue(null),
        acquireOutboundPermit: jest.fn().mockResolvedValue({ granted: true, inCooldown: false }),
        releaseOutboundPermit: jest.fn().mockResolvedValue(true),
        setProviderCooldown: jest.fn().mockResolvedValue(true),
      };

      const mockFetch = jest.fn();
      global.fetch = mockFetch;

      const provider = new SoilGridsProvider({
        cacheRepo: mockRepo,
        timeoutMs: 8000,
        failureCooldownSeconds: 60,
      });

      // Set active cooldown (60 seconds)
      provider.setCooldown(60 * 1000);

      const res = await provider.fetchSoil({ latitude: 30.65, longitude: 76.78 });

      // Must return unavailable with provider_cooldown reason immediately
      expect(res.status).toBe('unavailable');
      expect(res.isRateLimited).toBe(true);
      expect(res.reason).toBe('provider_cooldown');
      expect(res.remainingCooldownSeconds).toBeGreaterThan(0);

      // CRITICAL: fetch must NEVER be invoked during active cooldown
      expect(mockFetch).not.toHaveBeenCalled();
      // Zero DB permit calls needed when in-memory cooldown is already active
      expect(mockRepo.acquireOutboundPermit).not.toHaveBeenCalled();
    });

    it('returns stale valid soil data from L2 persistent cache during provider failure or cooldown', async () => {
      const expiredDate = new Date(Date.now() - 5 * 24 * 3600 * 1000); // Expired 5 days ago
      const verifiedDate = new Date(Date.now() - 100 * 24 * 3600 * 1000); // Observed 100 days ago

      const validExpiredSoilData = {
        ph: 7.1,
        clayPercentage: 24.0,
        sandPercentage: 42.0,
        siltPercentage: 34.0,
        texture: 'Loam',
        organicCarbon: 13.0,
      };

      const mockRepo = {
        findByGridAndType: jest.fn().mockResolvedValue({
          grid_key: 'c13556:29412',
          cache_type: 'soil_exact',
          latitude: 30.65,
          longitude: 76.78,
          source: 'ISRIC SoilGrids',
          status: 'available',
          data: validExpiredSoilData,
          metadata: { isExactRasterCell: false },
          verified_at: verifiedDate,
          expires_at: expiredDate,
        }),
        getProviderCooldown: jest.fn().mockResolvedValue({
          cooldownUntil: new Date(Date.now() + 45 * 1000), // In active cooldown
          retryAfterSeconds: 45,
          reason: 'SoilGrids request timed out',
        }),
        upsertCache: jest.fn(),
      };

      const mockSoilProvider = {
        computeSoilRasterCell: soilGridsProvider.compute250mRasterCell,
        fetchSoil: jest.fn(), // Should not be called
      };

      const service = new EnvironmentService({
        cacheRepo: mockRepo,
        soilGridsProvider: mockSoilProvider,
      });

      const result = await service.getSoil(30.65, 76.78);

      expect(result.status).toBe('available');
      expect(result.stale).toBe(true);
      expect(result.data).toEqual(validExpiredSoilData);
      expect(result.warning).toContain('Serving cached soil properties');
      expect(result.metadata.staleFallback).toBe(true);
      expect(result.metadata.fromPersistentCache).toBe(true);
      expect(mockSoilProvider.fetchSoil).not.toHaveBeenCalled();
    });

    it('ensures no invalid measurements or timeout responses enter environment_cache', async () => {
      const mockRepo = {
        findByGridAndType: jest.fn().mockResolvedValue(null),
        getProviderCooldown: jest.fn().mockResolvedValue(null),
        acquireOutboundPermit: jest.fn().mockResolvedValue({ granted: true, inCooldown: false }),
        releaseOutboundPermit: jest.fn().mockResolvedValue(true),
        setProviderCooldown: jest.fn().mockResolvedValue(true),
        upsertCache: jest.fn(),
      };

      const mockSoilProvider = {
        computeSoilRasterCell: soilGridsProvider.compute250mRasterCell,
        fetchSoil: jest.fn().mockResolvedValue({
          status: 'unavailable',
          source: 'ISRIC SoilGrids',
          reason: 'timeout',
          error: 'Provider request timed out',
          data: null,
        }),
      };

      const service = new EnvironmentService({
        cacheRepo: mockRepo,
        soilGridsProvider: mockSoilProvider,
      });

      const result = await service.getSoil(30.65, 76.78);

      expect(result.status).toBe('unavailable');
      expect(result.reason).toBe('timeout');
      // Must NEVER upsert unavailable/timeout data to environment_cache
      expect(mockRepo.upsertCache).not.toHaveBeenCalled();
    });

    it('recovers and makes live outbound call after cooldown expires', async () => {
      const mockRepo = {
        getProviderCooldown: jest.fn().mockResolvedValue(null),
        acquireOutboundPermit: jest.fn().mockResolvedValue({ granted: true, inCooldown: false }),
        releaseOutboundPermit: jest.fn().mockResolvedValue(true),
        setProviderCooldown: jest.fn().mockResolvedValue(true),
        upsertCache: jest.fn().mockResolvedValue({ id: 25 }),
      };

      const validResponse = {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [76.78, 30.65] },
        properties: {
          layers: [
            { name: 'phh2o', depths: [{ values: { mean: 72 } }] },
            { name: 'clay', depths: [{ values: { mean: 250 } }] },
            { name: 'sand', depths: [{ values: { mean: 400 } }] },
            { name: 'silt', depths: [{ values: { mean: 350 } }] },
            { name: 'soc', depths: [{ values: { mean: 150 } }] },
          ],
        },
      };

      const mockFetchSuccess = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => validResponse,
      });
      global.fetch = mockFetchSuccess;

      const provider = new SoilGridsProvider({
        cacheRepo: mockRepo,
        timeoutMs: 8000,
      });

      // Cooldown expired in the past
      provider.cooldownUntil = Date.now() - 5000;
      provider.initialized = true;

      const res = await provider.fetchSoil({ latitude: 30.65, longitude: 76.78 });

      expect(res.status).toBe('available');
      expect(res.data.ph).toBe(7.2);
      expect(res.data.clayPercentage).toBe(25.0);
      expect(res.data.texture).toBe('Loam');
      expect(mockFetchSuccess).toHaveBeenCalledTimes(1);
    });

    it('coalesces concurrent requests during SoilGrids queries without outbound request storms', async () => {
      let fetchResolve;
      const slowFetchPromise = new Promise((resolve) => {
        fetchResolve = resolve;
      });

      const mockFetchSlow = jest.fn().mockImplementation(() => slowFetchPromise);
      global.fetch = mockFetchSlow;

      const mockRepo = {
        findByGridAndType: jest.fn().mockResolvedValue(null),
        getProviderCooldown: jest.fn().mockResolvedValue(null),
        acquireOutboundPermit: jest.fn().mockResolvedValue({ granted: true, inCooldown: false }),
        releaseOutboundPermit: jest.fn().mockResolvedValue(true),
        upsertCache: jest.fn().mockResolvedValue({ id: 26 }),
      };

      const validResponse = {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [76.78, 30.65] },
        properties: {
          layers: [
            { name: 'phh2o', depths: [{ values: { mean: 68 } }] },
            { name: 'clay', depths: [{ values: { mean: 220 } }] },
            { name: 'sand', depths: [{ values: { mean: 450 } }] },
            { name: 'silt', depths: [{ values: { mean: 330 } }] },
            { name: 'soc', depths: [{ values: { mean: 120 } }] },
          ],
        },
      };

      const provider = new SoilGridsProvider({
        cacheRepo: mockRepo,
        timeoutMs: 8000,
      });

      const service = new EnvironmentService({
        cacheRepo: mockRepo,
        soilGridsProvider: provider,
      });

      // Launch 5 concurrent calls for the exact same location
      const calls = Promise.all([
        service.getSoil(30.65, 76.78),
        service.getSoil(30.65, 76.78),
        service.getSoil(30.65, 76.78),
        service.getSoil(30.65, 76.78),
        service.getSoil(30.65, 76.78),
      ]);

      // Release the slow fetch response
      fetchResolve({
        ok: true,
        status: 200,
        json: async () => validResponse,
      });

      const results = await calls;

      // Exactly 1 outbound fetch call dispatched across all 5 requests
      expect(mockFetchSlow).toHaveBeenCalledTimes(1);
      // All 5 callers received identical valid data
      expect(results).toHaveLength(5);
      results.forEach((r) => {
        expect(r.status).toBe('available');
        expect(r.data.ph).toBe(6.8);
      });
    });

    it('handles HTTP 429 on SoilGrids respecting Retry-After header bounded between 30 and 86400 seconds', async () => {
      const mockRepo = {
        getProviderCooldown: jest.fn().mockResolvedValue(null),
        acquireOutboundPermit: jest.fn().mockResolvedValue({ granted: true, inCooldown: false }),
        releaseOutboundPermit: jest.fn().mockResolvedValue(true),
        setProviderCooldown: jest.fn().mockResolvedValue(true),
      };

      const mockFetch429 = jest.fn().mockResolvedValue({
        ok: false,
        status: 429,
        headers: new Headers({ 'retry-after': '120' }),
      });
      global.fetch = mockFetch429;

      const provider = new SoilGridsProvider({
        cacheRepo: mockRepo,
        timeoutMs: 8000,
      });

      const res = await provider.fetchSoil({ latitude: 30.65, longitude: 76.78 });

      expect(res.status).toBe('unavailable');
      expect(res.reason).toBe('rate_limit');
      expect(res.isRateLimited).toBe(true);
      expect(res.remainingCooldownSeconds).toBe(120);

      // Verify 120s cooldown persisted to database
      expect(mockRepo.setProviderCooldown).toHaveBeenCalledWith(
        'soilgrids',
        120,
        expect.stringContaining('rate limit')
      );
    });
  });

  // =========================================================================
  // 10. Hybrid Urban Soil Strategy & Under-5-Second Deadline Tests
  // =========================================================================
  describe('10. Hybrid Urban Soil Strategy & Under-5-Second Deadline Tests', () => {
    it('10.1 Urban NoData detection without failure cooldown: returns urban_mask and does NOT trigger cooldown', async () => {
      const mockAllNullUrbanResponse = {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [76.78, 30.65] },
        properties: {
          layers: [
            { name: 'phh2o', depths: [{ depths: [], values: { mean: null } }] },
            { name: 'clay', depths: [{ depths: [], values: { mean: null } }] },
            { name: 'sand', depths: [{ depths: [], values: { mean: null } }] },
            { name: 'silt', depths: [{ depths: [], values: { mean: null } }] },
            { name: 'soc', depths: [{ depths: [], values: { mean: null } }] },
          ],
        },
      };

      const mockRepo = {
        getProviderCooldown: jest.fn().mockResolvedValue(null),
        acquireOutboundPermit: jest.fn().mockResolvedValue({ granted: true, inCooldown: false }),
        releaseOutboundPermit: jest.fn().mockResolvedValue(true),
        setProviderCooldown: jest.fn().mockResolvedValue(true),
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockAllNullUrbanResponse,
      });

      const provider = new SoilGridsProvider({ cacheRepo: mockRepo });
      const res = await provider.fetchSoil({ latitude: 30.65, longitude: 76.78 });

      expect(res.status).toBe('unavailable');
      expect(res.reason).toBe('urban_mask');
      expect(res.data).toBeNull();
      expect(res.error).toContain('urban built-up area');

      // CRITICAL: Urban mask is an expected geographic boundary, NOT a failure -> NO failure cooldown!
      expect(provider.cooldownUntil).toBe(0);
      expect(mockRepo.setProviderCooldown).not.toHaveBeenCalled();
    });

    it('10.2 Valid regional fallback and provenance: attaches complete directional and spatial provenance', async () => {
      const mockRepo = {
        findByGridAndType: jest.fn().mockResolvedValue(null),
        getProviderCooldown: jest.fn().mockResolvedValue(null),
        acquireOutboundPermit: jest.fn().mockResolvedValue({ granted: true, inCooldown: false }),
        releaseOutboundPermit: jest.fn().mockResolvedValue(true),
        upsertCache: jest.fn().mockResolvedValue({ id: 101 }),
      };

      const mockProvider = {
        computeApproxSpatialCell: soilGridsProvider.computeApproxSpatialCell,
        compute250mRasterCell: soilGridsProvider.compute250mRasterCell,
        fetchSoil: jest.fn().mockImplementation(async ({ latitude, longitude }) => {
          // Exact site (30.65, 76.82) returns urban mask
          if (Math.abs(latitude - 30.65) < 0.01 && Math.abs(longitude - 76.82) < 0.01) {
            return {
              status: 'unavailable',
              source: 'ISRIC SoilGrids',
              reason: 'urban_mask',
              verifiedAt: null,
              data: null,
              error: 'Location is within an urban built-up area',
            };
          }
          // Cardinal probe North returns valid rural soil measurement
          return {
            status: 'available',
            source: 'ISRIC SoilGrids',
            verifiedAt: new Date().toISOString(),
            stale: false,
            data: {
              ph: 6.8,
              clayPercentage: 24.5,
              sandPercentage: 42.0,
              siltPercentage: 33.5,
              texture: 'Loam',
              organicCarbon: 32.0,
            },
          };
        }),
      };

      const service = new EnvironmentService({
        cacheRepo: mockRepo,
        soilGridsProvider: mockProvider,
        openMeteoProvider: {
          fetchWeather: jest.fn().mockResolvedValue({
            status: 'available',
            source: 'Open-Meteo',
            data: { temperature: 29.5 },
          }),
        },
      });

      const envResult = await service.getLocationEnvironment({
        lat: 30.65,
        lng: 76.82,
        enableRegionalBaseline: true,
      });

      expect(envResult.soil.status).toBe('regional_baseline');
      expect(envResult.soil.isRegional).toBe(true);
      expect(envResult.soil.spatialPrecision).toBe('regional_baseline');
      expect(envResult.soil.isExactSiteMeasurement).toBe(false);
      expect(envResult.soil.source).toContain('Regional Baseline');
      expect(envResult.soil.distanceKm).toBeGreaterThan(0);
      expect(envResult.soil.direction).toBeDefined();
      expect(envResult.soil.sampleLocation).toBeDefined();
      expect(envResult.soil.targetLocation).toEqual({ latitude: 30.65, longitude: 76.82 });
      expect(envResult.soil.warning).toContain('Regional soil baseline derived from nearby non-urban profile');
      expect(envResult.soil.data.ph).toBe(6.8);

      // Verifies regional cache has entry, but exact-site cache key does NOT have regional data
      expect(service.regionalCache.has(`regional:${service.computeSoilRasterCell(30.65, 76.82).cellKey}`)).toBe(true);
      expect(service.soilCache.has('soil_exact:30.65:76.82')).toBe(false);
    });

    it('10.3 Timeout versus urban-mask distinction: never triggers regional probing on timeout and persists failure cooldown', async () => {
      const mockRepo = {
        findByGridAndType: jest.fn().mockResolvedValue(null),
        getProviderCooldown: jest.fn().mockResolvedValue(null),
        acquireOutboundPermit: jest.fn().mockResolvedValue({ granted: true, inCooldown: false }),
        releaseOutboundPermit: jest.fn().mockResolvedValue(true),
        setProviderCooldown: jest.fn().mockResolvedValue(true),
      };

      const timeoutError = new Error('The operation was aborted due to timeout');
      timeoutError.name = 'TimeoutError';

      const mockProvider = {
        computeApproxSpatialCell: soilGridsProvider.computeApproxSpatialCell,
        compute250mRasterCell: soilGridsProvider.compute250mRasterCell,
        fetchSoil: jest.fn().mockResolvedValue({
          status: 'unavailable',
          source: 'ISRIC SoilGrids',
          reason: 'timeout',
          verifiedAt: null,
          data: null,
          error: 'Provider request timed out',
        }),
      };

      const service = new EnvironmentService({
        cacheRepo: mockRepo,
        soilGridsProvider: mockProvider,
        openMeteoProvider: {
          fetchWeather: jest.fn().mockResolvedValue({
            status: 'available',
            source: 'Open-Meteo',
            data: { temperature: 27.0 },
          }),
        },
      });

      const spyRegional = jest.spyOn(service, 'getRegionalSoilBaseline');

      const envResult = await service.getLocationEnvironment({
        lat: 30.65,
        lng: 76.82,
        enableRegionalBaseline: true,
      });

      // Must remain unavailable with timeout reason
      expect(envResult.soil.status).toBe('unavailable');
      expect(envResult.soil.reason).toBe('timeout');

      // A timeout may consult cached regional data, but must never launch probes.
      expect(spyRegional).toHaveBeenCalledWith(30.65, 76.82, { cacheOnly: true });
      expect(mockProvider.fetchSoil).toHaveBeenCalledTimes(1);
    });

    it('10.4 Under-4.5-second deadline with slow probes: enforces 4,500ms ceiling and aborts in-flight requests', async () => {
      const mockRepo = {
        findByGridAndType: jest.fn().mockResolvedValue(null),
        getProviderCooldown: jest.fn().mockResolvedValue(null),
        acquireOutboundPermit: jest.fn().mockResolvedValue({ granted: true, inCooldown: false }),
        releaseOutboundPermit: jest.fn().mockResolvedValue(true),
      };

      // Mock provider where exact site returns urban mask quickly (50ms), but probes hang for 10 seconds
      let probeAborted = false;
      const mockProvider = {
        computeApproxSpatialCell: soilGridsProvider.computeApproxSpatialCell,
        compute250mRasterCell: soilGridsProvider.compute250mRasterCell,
        fetchSoil: jest.fn().mockImplementation(async ({ latitude, longitude, signal }) => {
          if (Math.abs(latitude - 30.65) < 0.01 && Math.abs(longitude - 76.82) < 0.01) {
            return {
              status: 'unavailable',
              source: 'ISRIC SoilGrids',
              reason: 'urban_mask',
              verifiedAt: null,
              data: null,
              error: 'Urban area',
            };
          }

          // Probe simulation: wait for signal abort
          return new Promise((resolve) => {
            if (signal) {
              signal.addEventListener('abort', () => {
                probeAborted = true;
                resolve({
                  status: 'unavailable',
                  source: 'ISRIC SoilGrids',
                  reason: 'timeout',
                  error: 'Aborted by deadline',
                });
              });
            }
          });
        }),
      };

      const service = new EnvironmentService({
        cacheRepo: mockRepo,
        soilGridsProvider: mockProvider,
        openMeteoProvider: {
          fetchWeather: jest.fn().mockResolvedValue({
            status: 'available',
            source: 'Open-Meteo',
            data: { temperature: 28.0 },
          }),
        },
      });

      // Use a test-configured short deadline (e.g. 200 ms) to verify real wall-clock abort mechanism
      config.providers.soilGrids.overallDeadlineMs = 250;

      const startTime = Date.now();
      const envResult = await service.getLocationEnvironment({
        lat: 30.65,
        lng: 76.82,
        enableRegionalBaseline: true,
      });
      const elapsed = Date.now() - startTime;

      // Reset config
      config.providers.soilGrids.overallDeadlineMs = 4500;

      // Verify that the call returned within budget and probe was canceled
      expect(elapsed).toBeLessThan(1000);
      expect(envResult.weather.status).toBe('available');
      expect(envResult.soil.status).toBe('unavailable');
      expect(envResult.soil.reason).toBe('timeout');
      expect(probeAborted).toBe(true);
    });

    it('10.5 Stale regional L2 fallback: returns cached regional baseline with stale: true during provider cooldown', async () => {
      const expiredDate = new Date(Date.now() - 3 * 24 * 3600 * 1000); // Expired 3 days ago
      const verifiedDate = new Date(Date.now() - 93 * 24 * 3600 * 1000); // Verified 93 days ago

      const mockRepo = {
        findByGridAndType: jest.fn().mockImplementation((key, type) => {
          if (type === 'soil_regional') {
            return Promise.resolve({
              grid_key: 'c13556:29412:d10',
              cache_type: 'soil_regional',
              latitude: 30.65,
              longitude: 76.82,
              source: 'ISRIC SoilGrids (Regional Baseline)',
              status: 'regional_baseline',
              verified_at: verifiedDate.toISOString(),
              expires_at: expiredDate.toISOString(),
              data: {
                ph: 6.9,
                clayPercentage: 21.0,
                sandPercentage: 46.0,
                siltPercentage: 33.0,
                texture: 'Loam',
                organicCarbon: 28.0,
              },
              metadata: {
                isRegional: true,
                direction: 'North',
                distanceKm: 9.8,
                sampleLocation: { latitude: 30.74, longitude: 76.82 },
                targetLocation: { latitude: 30.65, longitude: 76.82 },
              },
            });
          }
          return Promise.resolve(null);
        }),
        getProviderCooldown: jest.fn().mockResolvedValue({
          cooldownUntil: new Date(Date.now() + 45000), // 45s remaining cooldown
          retryAfterSeconds: 45,
          reason: 'SoilGrids HTTP 429 rate limit exceeded',
        }),
        acquireOutboundPermit: jest.fn().mockResolvedValue({ granted: false, inCooldown: true }),
      };

      const mockProvider = {
        computeApproxSpatialCell: soilGridsProvider.computeApproxSpatialCell,
        compute250mRasterCell: soilGridsProvider.compute250mRasterCell,
        fetchSoil: jest.fn(),
      };

      const service = new EnvironmentService({
        cacheRepo: mockRepo,
        soilGridsProvider: mockProvider,
      });

      const startTime = Date.now();
      const regionalResult = await service.getRegionalSoilBaseline(30.65, 76.82);
      const elapsed = Date.now() - startTime;

      // Must return fast from database (< 50 ms)
      expect(elapsed).toBeLessThan(100);
      expect(regionalResult).toBeDefined();
      expect(regionalResult.status).toBe('regional_baseline');
      expect(regionalResult.isRegional).toBe(true);
      expect(regionalResult.stale).toBe(true);
      expect(regionalResult.staleAgeDays).toBeGreaterThanOrEqual(90);
      expect(regionalResult.warning).toContain('cooldown');
      expect(regionalResult.distanceKm).toBe(9.8);
      expect(regionalResult.direction).toBe('North');
      expect(regionalResult.data.ph).toBe(6.9);
      expect(mockProvider.fetchSoil).not.toHaveBeenCalled();
    });

    it('10.6 Concurrent probing and permit coordination: executes probes concurrently under session permit without conflict', async () => {
      const permitCalls = [];
      const releaseCalls = [];

      const mockRepo = {
        findByGridAndType: jest.fn().mockResolvedValue(null),
        getProviderCooldown: jest.fn().mockResolvedValue(null),
        acquireOutboundPermit: jest.fn().mockImplementation((provider, lease, holder) => {
          permitCalls.push({ provider, lease, holder });
          return Promise.resolve({ granted: true, inCooldown: false, permitHolder: holder });
        }),
        releaseOutboundPermit: jest.fn().mockImplementation((provider, holder) => {
          releaseCalls.push({ provider, holder });
          return Promise.resolve(true);
        }),
        upsertCache: jest.fn().mockResolvedValue({ id: 202 }),
      };

      let abortedProbes = 0;
      const mockProvider = {
        computeApproxSpatialCell: soilGridsProvider.computeApproxSpatialCell,
        compute250mRasterCell: soilGridsProvider.compute250mRasterCell,
        fetchSoil: jest.fn().mockImplementation(async ({ latitude, _longitude, _parentPermitHolder, signal }) => {
          // North probe finishes quickly with valid soil
          if (latitude > 30.7) {
            return {
              status: 'available',
              source: 'ISRIC SoilGrids',
              verifiedAt: new Date().toISOString(),
              data: { ph: 7.0, clayPercentage: 25.0, texture: 'Loam' },
            };
          }

          // Other probes simulate slow in-flight responses that should be canceled
          return new Promise((resolve) => {
            if (signal) {
              signal.addEventListener('abort', () => {
                abortedProbes++;
                resolve({ status: 'unavailable', reason: 'aborted' });
              });
            }
          });
        }),
      };

      const service = new EnvironmentService({
        cacheRepo: mockRepo,
        soilGridsProvider: mockProvider,
      });

      const res = await service.getRegionalSoilBaseline(30.65, 76.82);

      expect(res).toBeDefined();
      expect(res.status).toBe('regional_baseline');
      expect(res.data.ph).toBe(7.0);

      // Exactly 1 session permit acquired before parallel probing
      expect(permitCalls).toHaveLength(1);
      expect(permitCalls[0].provider).toBe('soilgrids');
      expect(permitCalls[0].holder).toContain('sg_reg_');

      // The permit holder is released exactly once in finally
      expect(releaseCalls).toHaveLength(1);
      expect(releaseCalls[0].holder).toBe(permitCalls[0].holder);

      // Verify that losing in-flight probes were aborted
      expect(abortedProbes).toBeGreaterThan(0);
    });

    it('10.7 Provider recovery after cooldown expiry: makes live call and recovers once cooldown threshold passes', async () => {
      const mockRepo = {
        getProviderCooldown: jest.fn().mockResolvedValue(null),
        acquireOutboundPermit: jest.fn().mockResolvedValue({ granted: true, inCooldown: false }),
        releaseOutboundPermit: jest.fn().mockResolvedValue(true),
        setProviderCooldown: jest.fn().mockResolvedValue(true),
      };

      const validResponse = {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [76.78, 30.65] },
        properties: {
          layers: [
            { name: 'phh2o', depths: [{ values: { mean: 71 } }] },
            { name: 'clay', depths: [{ values: { mean: 230 } }] },
            { name: 'sand', depths: [{ values: { mean: 440 } }] },
            { name: 'silt', depths: [{ values: { mean: 330 } }] },
            { name: 'soc', depths: [{ values: { mean: 130 } }] },
          ],
        },
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => validResponse,
      });

      const provider = new SoilGridsProvider({
        cacheRepo: mockRepo,
        timeoutMs: 8000,
      });

      // Expired cooldown in past
      provider.cooldownUntil = Date.now() - 1000;
      provider.initialized = true;

      const res = await provider.fetchSoil({ latitude: 30.65, longitude: 76.78 });
      expect(res.status).toBe('available');
      expect(res.data.ph).toBe(7.1);
      expect(res.stale).toBe(false);
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('10.8 Verify no invalid soil values are cached: never commits NoData or urban mask to persistent cache', async () => {
      const mockRepo = {
        findByGridAndType: jest.fn().mockResolvedValue(null),
        getProviderCooldown: jest.fn().mockResolvedValue(null),
        acquireOutboundPermit: jest.fn().mockResolvedValue({ granted: true, inCooldown: false }),
        releaseOutboundPermit: jest.fn().mockResolvedValue(true),
        upsertCache: jest.fn().mockResolvedValue({ id: 303 }),
      };

      const mockProvider = {
        computeApproxSpatialCell: soilGridsProvider.computeApproxSpatialCell,
        compute250mRasterCell: soilGridsProvider.compute250mRasterCell,
        fetchSoil: jest.fn().mockResolvedValue({
          status: 'unavailable',
          source: 'ISRIC SoilGrids',
          reason: 'urban_mask',
          verifiedAt: null,
          data: null,
        }),
      };

      const service = new EnvironmentService({
        cacheRepo: mockRepo,
        soilGridsProvider: mockProvider,
      });

      const res = await service.getSoil(30.65, 76.78);
      expect(res.status).toBe('unavailable');
      expect(res.reason).toBe('urban_mask');

      // upsertCache must NEVER be called with unavailable or urban mask data
      expect(mockRepo.upsertCache).not.toHaveBeenCalled();
      // in-memory soilCache must NOT contain the entry
      expect(service.soilCache.size).toBe(0);
    });

    it('10.9 Master deadline applies to complete response: aborts slow weather and slow soil within budget', async () => {
      let weatherSignalReceived = null;
      let soilSignalReceived = null;

      const mockOpenMeteo = {
        ensureInitialized: jest.fn().mockResolvedValue(),
        getCooldownUntil: jest.fn().mockReturnValue(0),
        fetchWeather: jest.fn().mockImplementation(({ signal }) => {
          weatherSignalReceived = signal;
          return new Promise((resolve) => {
            if (signal) {
              signal.addEventListener('abort', () => {
                resolve({
                  status: 'unavailable',
                  source: 'Open-Meteo',
                  verifiedAt: null,
                  data: null,
                  error: 'Provider request timed out',
                });
              });
            }
          });
        }),
      };

      const mockSoilGrids = {
        computeApproxSpatialCell: soilGridsProvider.computeApproxSpatialCell,
        compute250mRasterCell: soilGridsProvider.compute250mRasterCell,
        fetchSoil: jest.fn().mockImplementation(({ signal }) => {
          soilSignalReceived = signal;
          return new Promise((resolve) => {
            if (signal) {
              signal.addEventListener('abort', () => {
                resolve({
                  status: 'unavailable',
                  source: 'ISRIC SoilGrids',
                  reason: 'timeout',
                  verifiedAt: null,
                  data: null,
                  error: 'Provider request timed out',
                });
              });
            }
          });
        }),
      };

      const service = new EnvironmentService({
        cacheRepo: {
          findByGridAndType: jest.fn().mockResolvedValue(null),
        },
        openMeteoProvider: mockOpenMeteo,
        soilGridsProvider: mockSoilGrids,
      });

      // Override deadlines to small test values (e.g. 50ms) to keep unit test fast
      const origDeadline = config.providers.soilGrids.overallDeadlineMs;
      const origExactTimeout = config.providers.soilGrids.exactTimeoutMs;
      const origWeatherTimeout = config.providers.openMeteo.timeoutMs;
      config.providers.soilGrids.overallDeadlineMs = 80;
      config.providers.soilGrids.exactTimeoutMs = 60;
      config.providers.openMeteo.timeoutMs = 80;

      const t0 = Date.now();
      try {
        const envResult = await service.getLocationEnvironment({ lat: 30.65, lng: 76.78 });
        const elapsed = Date.now() - t0;

        expect(elapsed).toBeLessThan(300); // Finished well within test deadline
        expect(weatherSignalReceived).toBeDefined();
        expect(soilSignalReceived).toBeDefined();
        expect(envResult.weather.status).toBe('unavailable');
        expect(envResult.weather.reason).toBe('timeout');
        expect(envResult.soil.status).toBe('unavailable');
        expect(envResult.soil.reason).toBe('timeout');
      } finally {
        config.providers.soilGrids.overallDeadlineMs = origDeadline;
        config.providers.soilGrids.exactTimeoutMs = origExactTimeout;
        config.providers.openMeteo.timeoutMs = origWeatherTimeout;
      }
    });
  });
});
