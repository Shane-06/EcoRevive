'use strict';

const { deriveSoilTexture } = require('./soilGrids.provider');
const defaultRepo = require('../repositories/environmentCache.repository');

const PROPERTIES = { phh2o: 'ph', clay: 'clayPercentage', sand: 'sandPercentage', silt: 'siltPercentage', soc: 'organicCarbon' };
const SIZE = 141;
const RADIUS_KM = 17.5;

async function decodeGeoTiff(buffer) {
  const { fromArrayBuffer } = await import('geotiff');
  const tiff = await fromArrayBuffer(buffer);
  const image = await tiff.getImage();
  return { values: await image.readRasters({ interleave: true }), width: image.getWidth(), height: image.getHeight(), noData: image.getGDALNoData() };
}

class SoilCoverageProvider {
  constructor(deps = {}) {
    this.fetch = deps.fetch || ((...args) => fetch(...args));
    this.cacheRepo = deps.cacheRepo || defaultRepo;
    this.decode = deps.decode || decodeGeoTiff;
    this.tiles = new Map();
    this.pending = new Map();
    this.cooldownUntil = 0;
    this.failures = new Map();
  }

  async fetchSoil({ latitude, longitude, signal, timeoutMs = 4000, enableRegionalBaseline = true }) {
    const lat = Number(latitude), lng = Number(longitude);
    const centerLat = Number(lat.toFixed(1)), centerLng = Number(lng.toFixed(1));
    const key = `${centerLat}:${centerLng}`;
    if ((this.failures.get(key) || 0) > Date.now()) return { status: 'unavailable', source: 'ISRIC SoilGrids WCS', data: null, reason: 'provider_cooldown', error: 'Soil coverage lookup is backing off after a recent failure.' };
    let tile = this.tiles.get(key);
    if (!tile || tile.until < Date.now()) {
      if (!this.pending.has(key)) {
        const request = this._load(centerLat, centerLng, signal, timeoutMs).finally(() => this.pending.delete(key));
        this.pending.set(key, request);
      }
      tile = await this.pending.get(key);
      if (tile.layers.length) {
        if (this.tiles.size >= 32) this.tiles.delete(this.tiles.keys().next().value);
        // Partial tiles are retried only after a short backoff; complete coverages are static models.
        tile.until = Date.now() + (tile.layers.length === 5 ? 90 * 86400000 : 60000);
        this.tiles.set(key, tile);
      }
    }
    if (!tile.layers.length) {
      if (this.failures.size >= 500) this.failures.delete(this.failures.keys().next().value);
      this.failures.set(key, Date.now() + 15000);
      return { status: 'unavailable', source: 'ISRIC SoilGrids WCS', data: null, reason: 'provider_error', error: 'Soil coverage service is temporarily unavailable.' };
    }
    const sample = (sampleLat, sampleLng, direction) => {
      const layer = tile.layers[0];
      const x = Math.max(0, Math.min(layer.width - 1, Math.floor((sampleLng - tile.bounds[0]) / (tile.bounds[2] - tile.bounds[0]) * layer.width)));
      const y = Math.max(0, Math.min(layer.height - 1, Math.floor((tile.bounds[3] - sampleLat) / (tile.bounds[3] - tile.bounds[1]) * layer.height)));
      const data = Object.fromEntries(Object.values(PROPERTIES).map((name) => [name, null]));
      for (const raster of tile.layers) {
        const raw = raster.values[y * raster.width + x];
        const value = raw / 10;
        const validRange = raster.property === 'phh2o' ? value >= 2 && value <= 12
          : value >= 0 && value <= (raster.property === 'soc' ? 1000 : 100);
        if (Number.isFinite(raw) && raw !== raster.noData && raw !== -32768 && validRange) data[PROPERTIES[raster.property]] = value;
      }
      if (!Object.values(data).some(Number.isFinite)) return null;
      data.texture = deriveSoilTexture(data.clayPercentage, data.sandPercentage, data.siltPercentage);
      data.organicCarbonUnit = 'g/kg';
      const source = {
        latitude: tile.bounds[3] - (y + 0.5) / layer.height * (tile.bounds[3] - tile.bounds[1]),
        longitude: tile.bounds[0] + (x + 0.5) / layer.width * (tile.bounds[2] - tile.bounds[0]),
      };
      const dLat = (source.latitude - lat) * Math.PI / 180;
      const dLng = (source.longitude - lng) * Math.PI / 180;
      const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat * Math.PI / 180) * Math.cos(source.latitude * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
      const distanceKm = Math.round(6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 10) / 10;
      return {
        status: direction ? 'regional_baseline' : 'available', source: 'ISRIC SoilGrids WCS', verifiedAt: tile.verifiedAt, stale: false, data,
        ...(direction ? { isRegional: true, direction, distanceKm, sampleLocation: source, targetLocation: { latitude: lat, longitude: lng }, samplingMethod: 'cardinal_raster_sample', isExactSiteMeasurement: false } : {}),
        warning: direction
          ? `Regional modeled soil baseline ${distanceKm} km ${direction} of the selected point; not an exact-site measurement.`
          : 'SoilGrids modeled 0–5 cm raster profile, sampled near the selected point; not an in-situ measurement.',
        metadata: {
          depth: '0-5cm', accessMethod: 'WCS 1.0.0', sourceLocation: source, targetLocation: { latitude: lat, longitude: lng },
          spatialPrecision: direction ? 'regional_baseline' : 'approximate_grid_bucket',
          isExactSiteMeasurement: false, isExactRasterCell: false, resampling: 'nearest',
          nominalResolution: '~250m reprojected SoilGrids model',
          missingProperties: Object.keys(PROPERTIES).filter((property) => !tile.layers.some((r) => r.property === property)),
          attribution: 'SoilGrids 2.0, ISRIC – World Soil Information (CC BY 4.0)', attributionUrl: 'https://soilgrids.org/',
        },
      };
    };
    const exact = sample(lat, lng);
    if (exact) return exact;
    if (tile.layers.length < 5) return { status: 'unavailable', source: 'ISRIC SoilGrids WCS', data: null, reason: 'provider_error', error: 'Incomplete coverage response; urban masking cannot yet be established.' };
    if (!enableRegionalBaseline) return { status: 'unavailable', source: 'ISRIC SoilGrids WCS', data: null, reason: 'urban_mask', error: 'The selected pixel has no modeled values; regional sampling is disabled.' };
    // Sample the existing four-cardinal strategy from the same downloaded rasters:
    // no additional network calls and no fabricated values at masked pixels.
    const dy = 10 / 110.574, dx = 10 / (111.32 * Math.max(0.01, Math.abs(Math.cos(lat * Math.PI / 180))));
    for (const [direction, a, b] of [['North', lat + dy, lng], ['East', lat, lng + dx], ['South', lat - dy, lng], ['West', lat, lng - dx]]) {
      if (a >= -90 && a <= 90 && b >= -180 && b <= 180) {
        const regional = sample(a, b, direction);
        if (regional) return regional;
      }
    }
    return { status: 'unavailable', source: 'ISRIC SoilGrids WCS', data: null, reason: 'urban_mask', error: 'The selected point and cardinal regional samples have no modeled soil values.' };
  }

  async _load(lat, lng, signal, timeoutMs) {
    const dy = RADIUS_KM / 110.574;
    const dx = RADIUS_KM / (111.32 * Math.max(0.01, Math.abs(Math.cos(lat * Math.PI / 180))));
    const bounds = [Math.max(-180, lng - dx), Math.max(-90, lat - dy), Math.min(180, lng + dx), Math.min(90, lat + dy)];
    const tile = { bounds, layers: [], verifiedAt: new Date().toISOString() };
    const persisted = await this.cacheRepo.getProviderCooldown?.('soilgrids-wcs');
    this.cooldownUntil = Math.max(this.cooldownUntil, new Date(persisted?.cooldownUntil || 0).getTime());
    if (this.cooldownUntil > Date.now()) return tile;
    const controller = new AbortController();
    const abort = () => controller.abort(signal.reason);
    if (signal?.aborted) abort(); else signal?.addEventListener('abort', abort, { once: true });
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const properties = Object.keys(PROPERTIES);
    const worker = async () => {
      while (properties.length && !controller.signal.aborted && this.cooldownUntil <= Date.now()) {
        const property = properties.shift();
        const url = new URL(`https://maps.isric.org/mapserv/${property}`);
        for (const [name, value] of Object.entries({ SERVICE: 'WCS', VERSION: '1.0.0', REQUEST: 'GetCoverage', COVERAGE: `${property}_0-5cm_mean`, CRS: 'EPSG:4326', BBOX: bounds.join(','), WIDTH: SIZE, HEIGHT: SIZE, FORMAT: 'GEOTIFF_INT16', INTERPOLATION: 'NEAREST' })) url.searchParams.set(name, value);
        try {
          const response = await this.fetch(url.toString(), { signal: controller.signal, headers: { Accept: 'image/tiff', 'User-Agent': 'EcoRevive/1.0 https://eco-revive-lake.vercel.app/' } });
          if ([429, 503].includes(response.status)) {
            const retry = response.headers.get('retry-after');
            const seconds = /^\d+$/.test(retry || '') ? Number(retry) : Math.ceil((Date.parse(retry) - Date.now()) / 1000);
            this.cooldownUntil = Date.now() + Math.max(60, seconds || 60) * 1000;
            await this.cacheRepo.setProviderCooldown?.('soilgrids-wcs', Math.max(60, seconds || 60), `ISRIC WCS HTTP ${response.status}`);
            continue;
          }
          if (!response.ok) continue;
          const raster = await this.decode(await response.arrayBuffer());
          if (raster.width === SIZE && raster.height === SIZE) tile.layers.push({ ...raster, property });
        } catch { /* A missing layer stays null; other properties can still be displayed. */ }
      }
    };
    try { await Promise.all([worker(), worker(), worker()]); return tile; }
    finally { clearTimeout(timer); signal?.removeEventListener('abort', abort); }
  }
}

module.exports = { SoilCoverageProvider, decodeGeoTiff };
