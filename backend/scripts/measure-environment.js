'use strict';

// Opt-in, bounded live-provider measurement. No configured database is read or written.
if (!process.argv.includes('--live')) {
  console.error('Run with --live to make one cold lookup and one cached lookup against existing providers.');
  process.exit(1);
}

const { performance } = require('node:perf_hooks');
const { EnvironmentService } = require('../src/services/environment.service');
const { OpenMeteoProvider } = require('../src/integrations/openMeteo.provider');
const { SoilGridsProvider } = require('../src/integrations/soilGrids.provider');

const rows = new Map();
const cooldowns = new Map();
const permits = new Map();
const requestTimes = [];
const memoryRepo = {
  async findByGridAndType(key, type) { return rows.get(`${type}:${key}`) || null; },
  async upsertCache(value) {
    rows.set(`${value.cacheType}:${value.gridKey}`, {
      ...value, verified_at: value.verifiedAt, expires_at: value.expiresAt,
    });
  },
  async getProviderCooldown(name) { return cooldowns.get(name) || null; },
  async setProviderCooldown(name, seconds) { cooldowns.set(name, { cooldownUntil: new Date(Date.now() + seconds * 1000) }); },
  async acquireOutboundPermit(name, _lease, holder) {
    const cd = cooldowns.get(name);
    if (cd?.cooldownUntil > new Date()) return { granted: false, inCooldown: true, ...cd };
    if (permits.has(name)) return { granted: false, inCooldown: false };
    permits.set(name, holder);
    return { granted: true, permitHolder: holder };
  },
  async releaseOutboundPermit(name, holder) { if (permits.get(name) === holder) permits.delete(name); },
  async reserveSoilRequest() {
    if (requestTimes.filter((at) => Date.now() - at < 60000).length >= 5) return false;
    requestTimes.push(Date.now());
    return true;
  },
};

const upstream = [];
const realFetch = global.fetch;
global.fetch = async (url, options) => {
  const started = performance.now();
  const record = { provider: new URL(url).hostname };
  upstream.push(record);
  try {
    const response = await realFetch(url, options);
    record.status = response.status;
    return response;
  } catch (err) {
    record.error = err.name;
    throw err;
  } finally { record.headersOrErrorMs = Math.round(performance.now() - started); }
};

async function main() {
  const alternatives = process.argv.includes('--alternatives');
  const openMeteo = new OpenMeteoProvider({ cacheRepo: memoryRepo });
  if (alternatives) openMeteo.setCooldown(3600000);
  const service = new EnvironmentService({
    cacheRepo: memoryRepo,
    openMeteoProvider: openMeteo,
    soilGridsProvider: new SoilGridsProvider({ cacheRepo: memoryRepo }),
    enableAlternatives: alternatives,
  });
  const readCoord = (name, fallback) => Number(process.argv.find((arg) => arg.startsWith(`--${name}=`))?.split('=')[1] || fallback);
  const coords = { lat: readCoord('lat', 30.65), lng: readCoord('lng', 76.78) };
  for (const mode of ['cold', 'warm']) {
    const started = performance.now();
    const completion = {};
    const parts = await Promise.all(['weather', 'soil'].map(async (section) => {
      const result = await service.getLocationEnvironment({ ...coords, section });
      completion[section] = { milliseconds: Math.round(performance.now() - started), status: result[section].status, source: result[section].source, reason: result[section].reason, verifiedAt: result[section].verifiedAt, sampleLocation: result[section].sampleLocation, direction: result[section].direction, distanceKm: result[section].distanceKm };
      return result;
    }));
    console.log(JSON.stringify({ mode, coords, simulatedOpenMeteoCooldown: alternatives, source: 'live providers, in-memory repository; excludes Render and PostgreSQL latency', totalMs: Math.round(performance.now() - started), completion, measurements: { weather: parts[0].weather.data, soil: parts[1].soil.data }, upstream }, null, 2));
  }
}

main().catch((err) => { console.error(err.message); process.exitCode = 1; });
