'use strict';

const { MetNorwayProvider } = require('../integrations/metNorway.provider');
const { SoilCoverageProvider } = require('../integrations/soilCoverage.provider');
const { EnvironmentService } = require('../services/environment.service');

const soil = { ph: 6.3, clayPercentage: 24.2, sandPercentage: 44.9, siltPercentage: 30.9, organicCarbon: 43.6, texture: 'Loam' };
const repo = () => ({ getProviderCooldown: jest.fn().mockResolvedValue(null), setProviderCooldown: jest.fn(), findByGridAndType: jest.fn().mockResolvedValue(null), upsertCache: jest.fn() });
afterEach(() => jest.restoreAllMocks());

describe('Alternative environmental access', () => {
  it('falls back during a genuine Open-Meteo cooldown without calling Open-Meteo', async () => {
    const cacheRepo = repo();
    const primary = { ensureInitialized: jest.fn(), getCooldownUntil: () => Date.now() + 8896000, fetchWeather: jest.fn() };
    const secondary = { fetchWeather: jest.fn().mockResolvedValue({ status: 'available', source: 'MET Norway', data: { temperature: 14.2, humidity: 82.6, precipitation: 0, windSpeed: 5.4 }, verifiedAt: new Date().toISOString(), metadata: { dataKind: 'model_forecast', cacheTtlMs: 10800000 } }) };
    const service = new EnvironmentService({ enableAlternatives: true, cacheRepo, openMeteoProvider: primary, alternateWeather: secondary });
    const result = await service.getLocationEnvironment({ lat: 30.6945, lng: 76.8357, section: 'weather' });
    expect(result.location).toEqual({ latitude: 30.6945, longitude: 76.8357 });
    expect(result.weather.source).toBe('MET Norway');
    expect(primary.fetchWeather).not.toHaveBeenCalled();
    expect(cacheRepo.upsertCache).toHaveBeenCalledWith(expect.objectContaining({ source: 'MET Norway', cacheType: 'weather' }));
  });

  it('reads coverage independently of the REST provider permit or cooldown', async () => {
    const rest = { fetchSoil: jest.fn() };
    const coverage = { fetchSoil: jest.fn().mockResolvedValue({ status: 'regional_baseline', isRegional: true, source: 'ISRIC SoilGrids WCS', verifiedAt: new Date().toISOString(), data: soil, sampleLocation: { latitude: 30.7853, longitude: 76.8363 }, direction: 'North', distanceKm: 10.1, metadata: { sourceLocation: { latitude: 30.7853, longitude: 76.8363 }, missingProperties: [] } }) };
    const service = new EnvironmentService({ enableAlternatives: true, cacheRepo: repo(), soilGridsProvider: rest, soilCoverage: coverage });
    const result = await service.getLocationEnvironment({ lat: 30.6945, lng: 76.8357, section: 'soil' });
    expect(result.soil.data.ph).toBe(6.3);
    expect(result.soil.isRegional).toBe(true);
    expect(rest.fetchSoil).not.toHaveBeenCalled();
    expect(coverage.fetchSoil).toHaveBeenCalledTimes(1);
  });

  it('normalizes and labels MET forecast units, intervals and attribution, and caches for 3 hours', async () => {
    const cacheRepo = repo();
    const fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ properties: { meta: { updated_at: new Date().toISOString() }, timeseries: [{ time: new Date().toISOString(), data: { instant: { details: { air_temperature: 14.2, relative_humidity: 82.6, wind_speed: 1.5 } }, next_1_hours: { details: { precipitation_amount: 0 }, summary: { symbol_code: 'clearsky_night' } } } }] } }) });
    const provider = new MetNorwayProvider({ cacheRepo, fetch });
    const result = await provider.fetchWeather({ latitude: 30.6945, longitude: 76.8357 });
    expect(result.data.windSpeed).toBe(5.4);
    expect(result.data.precipitation).toBe(0);
    expect(result.data.precipitationPeriod).toBe('next_hour');
    expect(result.metadata.dataKind).toBe('model_forecast');
    expect(result.metadata.attribution).toContain('MET Norway');
    expect(result.metadata.cacheTtlMs).toBe(10800000);
    await provider.fetchWeather({ latitude: 30.6945, longitude: 76.8357 });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('honors the alternative weather provider own Retry-After', async () => {
    const fetch = jest.fn().mockResolvedValue({ ok: false, status: 429, headers: new Headers({ 'retry-after': '3600' }) });
    const provider = new MetNorwayProvider({ cacheRepo: repo(), fetch });
    await provider.fetchWeather({ latitude: 30, longitude: 76 });
    const result = await provider.fetchWeather({ latitude: 28, longitude: 77 });
    expect(result.reason).toBe('provider_cooldown');
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  function coverageProvider({ masked = false, allMasked = false, broken = false } = {}) {
    const fetch = jest.fn().mockImplementation(async (url) => ({ ok: true, arrayBuffer: async () => new URL(url).pathname.split('/').at(-1) }));
    const decode = jest.fn().mockImplementation(async (property) => {
      if (broken && property === 'soc') throw new Error('bad TIFF');
      const value = { phh2o: 63, clay: 242, sand: 449, silt: 309, soc: 436 }[property];
      const values = new Int16Array(141 * 141).fill(allMasked ? -32768 : value);
      if (masked) {
        // Mask the central target while leaving 10km cardinal pixels intact.
        for (let y = 48; y <= 92; y++) for (let x = 48; x <= 92; x++) values[y * 141 + x] = -32768;
      }
      return { width: 141, height: 141, values, noData: -32768 };
    });
    return { provider: new SoilCoverageProvider({ fetch, decode, cacheRepo: repo() }), fetch };
  }

  it('decodes real property scales and reuses one coverage tile across nearby clicks', async () => {
    const { provider, fetch } = coverageProvider();
    const result = await provider.fetchSoil({ latitude: 30.7, longitude: 76.8 });
    expect(result.status).toBe('available');
    expect(result.data).toMatchObject(soil);
    expect(result.metadata.isExactSiteMeasurement).toBe(false);
    const nearby = await provider.fetchSoil({ latitude: 30.71, longitude: 76.81 });
    expect(nearby.metadata.targetLocation.latitude).toBe(30.71);
    expect(nearby.metadata.sourceLocation).not.toEqual(result.metadata.sourceLocation);
    expect(fetch).toHaveBeenCalledTimes(5);
  });

  it('samples four-cardinal fallback from the same rasters without extra requests', async () => {
    const { provider, fetch } = coverageProvider({ masked: true });
    const results = await Promise.all(Array.from({ length: 5 }, () => provider.fetchSoil({ latitude: 30.7, longitude: 76.8 })));
    expect(results[0].status).toBe('regional_baseline');
    expect(results[0].direction).toBe('North');
    expect(results[0].distanceKm).toBeGreaterThan(9);
    expect(results[0].distanceKm).toBeLessThan(11);
    expect(results[0].isExactSiteMeasurement).toBe(false);
    expect(fetch).toHaveBeenCalledTimes(5);
  });

  it('leaves all NoData unavailable and supports partial valid properties', async () => {
    const masked = coverageProvider({ allMasked: true });
    expect((await masked.provider.fetchSoil({ latitude: 30.7, longitude: 76.8 })).reason).toBe('urban_mask');
    const partial = coverageProvider({ broken: true });
    const result = await partial.provider.fetchSoil({ latitude: 30.7, longitude: 76.8 });
    expect(result.data.ph).toBe(6.3);
    expect(result.data.organicCarbon).toBeNull();
    expect(result.metadata.missingProperties).toEqual(['soc']);
  });

  it('honors an explicit opt-out of regional soil sampling', async () => {
    const { provider } = coverageProvider({ masked: true });
    const result = await provider.fetchSoil({ latitude: 30.7, longitude: 76.8, enableRegionalBaseline: false });
    expect(result.reason).toBe('urban_mask');
    expect(result.data).toBeNull();
  });
});
