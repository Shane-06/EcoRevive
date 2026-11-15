'use strict';

const config = require('../config');
const { EnvironmentService } = require('../services/environment.service');
const { OpenMeteoProvider } = require('../integrations/openMeteo.provider');
const { SoilGridsProvider, computeApproxSpatialCell } = require('../integrations/soilGrids.provider');
const { EnvironmentCacheRepository } = require('../repositories/environmentCache.repository');

const soilData = { ph: 7.2, clayPercentage: 23.1, sandPercentage: 40.2, siltPercentage: 36.7, organicCarbon: 24.1 };
const repo = () => ({
  getProviderCooldown: jest.fn().mockResolvedValue(null),
  findByGridAndType: jest.fn().mockResolvedValue(null),
  acquireOutboundPermit: jest.fn().mockImplementation((_name, _lease, holder) => Promise.resolve({ granted: true, permitHolder: holder })),
  releaseOutboundPermit: jest.fn().mockResolvedValue(true),
  setProviderCooldown: jest.fn().mockResolvedValue(true),
  reserveSoilRequest: jest.fn().mockResolvedValue(true),
  upsertCache: jest.fn().mockResolvedValue(null),
});

afterEach(() => { jest.restoreAllMocks(); jest.useRealTimers(); });

describe('Environmental availability regressions', () => {
  it.each([OpenMeteoProvider, SoilGridsProvider])('never fetches when an outbound permit is denied (%p)', async (Provider) => {
    const cacheRepo = repo();
    cacheRepo.acquireOutboundPermit.mockResolvedValue({ granted: false, inCooldown: false });
    const provider = new Provider({ cacheRepo });
    const fetchSpy = jest.spyOn(global, 'fetch');
    const result = await (provider.fetchWeather || provider.fetchSoil).call(provider, { latitude: 30.65, longitude: 76.78 });
    expect(result.reason).toBe('provider_busy');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('gives each request a different weather permit owner and keeps forecast_days=1', async () => {
    const cacheRepo = repo();
    const provider = new OpenMeteoProvider({ cacheRepo });
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({ ok: true, json: async () => ({ current: {} }) });
    await provider.fetchWeather({ latitude: 30.65, longitude: 76.78 });
    await provider.fetchWeather({ latitude: 29, longitude: 77 });
    const owners = cacheRepo.acquireOutboundPermit.mock.calls.map((call) => call[2]);
    expect(new Set(owners).size).toBe(2);
    expect(new URL(fetchSpy.mock.calls[0][0]).searchParams.get('forecast_days')).toBe('1');
  });

  it('honors a real long weather Retry-After across different locations', async () => {
    const cacheRepo = repo();
    const provider = new OpenMeteoProvider({ cacheRepo });
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({ ok: false, status: 429, headers: new Headers({ 'retry-after': '18000' }) });
    await provider.fetchWeather({ latitude: 30.65, longitude: 76.78 });
    const result = await provider.fetchWeather({ latitude: 28.61, longitude: 77.2 });
    expect(result.isRateLimited).toBe(true);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(cacheRepo.setProviderCooldown).toHaveBeenCalledWith('open-meteo', 18000, expect.any(String));
  });

  it('parses HTTP-date Retry-After correctly rather than treating its day as seconds', () => {
    const provider = new OpenMeteoProvider({ cacheRepo: repo() });
    const date = new Date(Date.now() + 3600000).toUTCString();
    expect(provider.parseRetryAfter(new Headers({ 'retry-after': date }))).toBeGreaterThan(3590);
  });

  it('enforces the five-per-minute soil budget, including concurrent probes', async () => {
    const provider = new SoilGridsProvider({ cacheRepo: repo() });
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({ ok: true, json: async () => ({ properties: { layers: [] } }) });
    const results = await Promise.all(Array.from({ length: 12 }, (_, i) => provider.fetchSoil({
      latitude: 30 + i, longitude: 76, parentPermitHolder: 'test-regional-session',
    })));
    expect(fetchSpy).toHaveBeenCalledTimes(5);
    expect(results.filter((r) => r.reason === 'request_budget')).toHaveLength(7);
  });

  it('fails closed when the shared soil budget is unavailable', async () => {
    const cacheRepo = repo();
    cacheRepo.reserveSoilRequest.mockResolvedValue(false);
    const provider = new SoilGridsProvider({ cacheRepo });
    const fetchSpy = jest.spyOn(global, 'fetch');
    const result = await provider.fetchSoil({ latitude: 30.65, longitude: 76.78 });
    expect(result.reason).toBe('request_budget');
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(cacheRepo.releaseOutboundPermit).toHaveBeenCalled();
  });

  it('uses existing coordination storage for the atomic rolling budget without DDL', async () => {
    const query = jest.fn().mockResolvedValue({ rows: [{ provider_name: 'soilgrids:request-budget' }] });
    const repository = new EnvironmentCacheRepository({ db: { query } });
    expect(await repository.reserveSoilRequest()).toBe(true);
    const sql = query.mock.calls[0][0];
    expect(sql).toContain('ON CONFLICT');
    expect(sql).toContain('clock_timestamp()');
    expect(sql).toContain('< 5');
    expect(sql).not.toMatch(/\b(CREATE|ALTER|DROP)\b/);
  });

  it('returns cached regional soil after an exact timeout without launching probes', async () => {
    const cacheRepo = repo();
    const verifiedAt = new Date(Date.now() - 86400000).toISOString();
    cacheRepo.findByGridAndType.mockImplementation((_key, type) => Promise.resolve(type === 'soil_regional' ? {
      data: soilData, verified_at: verifiedAt, expires_at: new Date(Date.now() + 86400000),
      metadata: { direction: 'North', distanceKm: 10, sampleLocation: { latitude: 30.74, longitude: 76.78 } },
    } : null));
    const provider = { computeApproxSpatialCell, fetchSoil: jest.fn().mockResolvedValue({ status: 'unavailable', reason: 'timeout', data: null }) };
    const service = new EnvironmentService({ cacheRepo, soilGridsProvider: provider });
    const result = await service.getLocationEnvironment({ lat: 30.65, lng: 76.78, section: 'soil' });
    expect(result.soil.status).toBe('regional_baseline');
    expect(result.soil.verifiedAt).toBe(verifiedAt);
    expect(result.soil.isExactSiteMeasurement).toBe(false);
    expect(result.soil.sampleLocation.latitude).toBe(30.74);
    expect(provider.fetchSoil).toHaveBeenCalledTimes(1);
    expect(cacheRepo.acquireOutboundPermit).not.toHaveBeenCalled();
  });

  it('coalesces regional sessions for the same bucket and cancels losing probes', async () => {
    const cacheRepo = repo();
    const provider = { computeApproxSpatialCell, fetchSoil: jest.fn().mockImplementation(async ({ latitude, signal }) => {
      if (latitude > 30.7) return { status: 'available', data: soilData, verifiedAt: '2026-11-01T00:00:00Z' };
      return new Promise((resolve) => signal.addEventListener('abort', () => resolve({ status: 'unavailable', reason: 'aborted' }), { once: true }));
    }) };
    const service = new EnvironmentService({ cacheRepo, soilGridsProvider: provider });
    const results = await Promise.all(Array.from({ length: 10 }, () => service.getRegionalSoilBaseline(30.65, 76.78)));
    expect(cacheRepo.acquireOutboundPermit).toHaveBeenCalledTimes(1);
    expect(provider.fetchSoil).toHaveBeenCalledTimes(4);
    expect(results.every((result) => result.direction === 'North' && result.isRegional)).toBe(true);
    expect(results[0].verifiedAt).toBe('2026-11-01T00:00:00Z');
  });

  it('does not turn stale soil into a new fresh 90-day record', async () => {
    const cacheRepo = repo();
    const provider = { fetchSoil: jest.fn().mockResolvedValue({ status: 'available', stale: true, data: soilData, verifiedAt: '2026-01-01T00:00:00Z' }) };
    const service = new EnvironmentService({ cacheRepo, soilGridsProvider: provider });
    const result = await service.getSoil(30.65, 76.78);
    expect(result.stale).toBe(true);
    expect(cacheRepo.upsertCache).not.toHaveBeenCalled();
    expect(service.soilCache.size).toBe(0);
  });

  it('returns weather independently without invoking soil and bounds a hung cache lookup', async () => {
    jest.useFakeTimers();
    const cacheRepo = repo();
    const weather = { fetchWeather: jest.fn().mockResolvedValue({ status: 'available', data: { temperature: 25 } }) };
    const soil = { fetchSoil: jest.fn() };
    const service = new EnvironmentService({ cacheRepo, openMeteoProvider: weather, soilGridsProvider: soil });
    expect((await service.getLocationEnvironment({ lat: 30.65, lng: 76.78, section: 'weather' })).weather.status).toBe('available');
    expect(soil.fetchSoil).not.toHaveBeenCalled();
    service.clearCache();
    cacheRepo.findByGridAndType.mockReturnValue(new Promise(() => {}));
    const pending = service.getLocationEnvironment({ lat: 30.65, lng: 76.78, section: 'weather' });
    await jest.advanceTimersByTimeAsync(Math.min(config.providers.openMeteo.timeoutMs, 4500));
    expect((await pending).weather.reason).toBe('timeout');
  });
});
