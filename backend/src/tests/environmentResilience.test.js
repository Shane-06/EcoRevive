'use strict';

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

    it('when serving cached soil for identical coordinates (<15m), flags as exact_coordinates with no displacement warning', async () => {
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
      expect(result.metadata.spatialPrecision).toBe('exact_coordinates');
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
});
