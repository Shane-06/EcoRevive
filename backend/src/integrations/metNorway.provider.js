'use strict';

const defaultRepo = require('../repositories/environmentCache.repository');

class MetNorwayProvider {
  constructor(deps = {}) {
    this.cacheRepo = deps.cacheRepo || defaultRepo;
    this.fetch = deps.fetch || ((...args) => fetch(...args));
    this.cache = new Map();
    this.pending = new Map();
    this.cooldownUntil = 0;
  }

  async fetchWeather({ latitude, longitude, signal, timeoutMs = 4000 }) {
    const key = `${Number(latitude).toFixed(2)}:${Number(longitude).toFixed(2)}`;
    const cached = this.cache.get(key);
    if (cached && cached.until > Date.now()) return structuredClone(cached.result);
    if (this.pending.has(key)) return this.pending.get(key);
    const pending = this._fetch({ latitude, longitude, signal, timeoutMs });
    this.pending.set(key, pending);
    try {
      const result = await pending;
      if (result.status === 'available') {
        if (this.cache.size >= 500) this.cache.delete(this.cache.keys().next().value);
        this.cache.set(key, { result, until: Date.now() + result.metadata.cacheTtlMs });
      }
      return result;
    } finally { this.pending.delete(key); }
  }

  async _fetch({ latitude, longitude, signal, timeoutMs }) {
    const unavailable = (reason, error) => ({ status: 'unavailable', source: 'MET Norway', data: null, verifiedAt: null, reason, error });
    const cooldown = await this.cacheRepo.getProviderCooldown?.('met-norway');
    this.cooldownUntil = Math.max(this.cooldownUntil, new Date(cooldown?.cooldownUntil || 0).getTime());
    if (this.cooldownUntil > Date.now()) return unavailable('provider_cooldown', 'MET Norway is temporarily rate limited.');
    const controller = new AbortController();
    const abort = () => controller.abort(signal.reason);
    if (signal?.aborted) abort();
    else signal?.addEventListener('abort', abort, { once: true });
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const url = new URL('https://api.met.no/weatherapi/locationforecast/2.0/compact');
      url.searchParams.set('lat', Number(latitude).toFixed(2));
      url.searchParams.set('lon', Number(longitude).toFixed(2));
      const response = await this.fetch(url.toString(), {
        headers: { Accept: 'application/json', 'User-Agent': `EcoRevive/1.0 ${process.env.ENVIRONMENT_USER_AGENT_URL || 'https://eco-revive-lake.vercel.app/'}` },
        signal: controller.signal,
      });
      if (!response.ok) {
        if ([403, 429, 503].includes(response.status)) {
          const value = response.headers.get('retry-after');
          const seconds = /^\d+$/.test(value || '') ? Number(value) : Math.ceil((Date.parse(value) - Date.now()) / 1000);
          const wait = Math.max(60, Math.min(86400, seconds || 300));
          this.cooldownUntil = Date.now() + wait * 1000;
          await this.cacheRepo.setProviderCooldown?.('met-norway', wait, `MET Norway HTTP ${response.status}`);
        }
        return unavailable('provider_error', `MET Norway responded with HTTP ${response.status}`);
      }
      const json = await response.json();
      const series = json.properties?.timeseries || [];
      const now = Date.now();
      const current = series.filter((item) => new Date(item.time).getTime() <= now).at(-1) || series[0];
      if (!current || Math.abs(new Date(current.time).getTime() - now) > 3 * 3600000) return unavailable('no_data', 'No current forecast interval is available.');
      const values = current.data?.instant?.details || {};
      const next = current.data?.next_1_hours;
      if (![values.air_temperature, values.relative_humidity, values.wind_speed].every(Number.isFinite)) return unavailable('no_data', 'Forecast measurements are incomplete.');
      return {
        status: 'available', source: 'MET Norway', verifiedAt: new Date().toISOString(), stale: false,
        warning: 'Near-current model forecast from MET Norway; precipitation refers to the next hour.',
        data: {
          temperature: values.air_temperature, temperatureUnit: '°C', humidity: values.relative_humidity, humidityUnit: '%',
          precipitation: Number.isFinite(next?.details?.precipitation_amount) ? next.details.precipitation_amount : null,
          precipitationUnit: 'mm', precipitationPeriod: 'next_hour',
          windSpeed: Math.round(values.wind_speed * 36) / 10, windSpeedUnit: 'km/h',
          pressure: values.air_pressure_at_sea_level ?? null, cloudCover: values.cloud_area_fraction ?? null,
          weatherCode: null, condition: (next?.summary?.symbol_code || 'Forecast').replace(/_(day|night|polartwilight)$/, '').replace(/_/g, ' '),
          forecast: { maxTemp: null, minTemp: null, precipitationSum: null },
        },
        metadata: {
          dataKind: 'model_forecast', forecastTime: current.time, modelUpdatedAt: json.properties?.meta?.updated_at || null,
          sourceLocation: { latitude: Number(Number(latitude).toFixed(2)), longitude: Number(Number(longitude).toFixed(2)) },
          targetLocation: { latitude, longitude }, spatialPrecision: 'weather_model_grid',
          cacheTtlMs: 3 * 3600000, attribution: 'Weather forecast from MET Norway (CC BY 4.0)',
          attributionUrl: 'https://www.met.no/',
        },
      };
    } catch (err) {
      return unavailable(controller.signal.aborted ? 'timeout' : 'connection_error', `MET Norway forecast unavailable: ${err.message}`);
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', abort);
    }
  }
}

module.exports = { MetNorwayProvider };
