import { apiClient } from '../api/client';

const cache = new Map();
const pending = new Map();
const TTL = { weather: 30 * 60 * 1000, soil: 90 * 86400000 };

// Same nominal bucket as the backend, not an authoritative SoilGrids raster cell.
export function environmentBucket({ lat, lng }) {
  const deltaLat = 250 / 110574;
  const cos = Math.abs(Math.cos(Number(lat) * Math.PI / 180));
  const deltaLng = cos > 0.001 ? 250 / (111320 * cos) : deltaLat;
  return `c${Math.floor(Number(lat) / deltaLat)}:${Math.floor(Number(lng) / deltaLng)}`;
}

const keyFor = (section, coords) => section === 'weather'
  ? `weather:${Number(coords.lat).toFixed(2)}:${Number(coords.lng).toFixed(2)}`
  : `soil:${environmentBucket(coords)}`;
const aborted = () => new DOMException('Assessment cancelled', 'AbortError');

function subscribe(entry, signal) {
  entry.users++;
  return new Promise((resolve, reject) => {
    let finished = false;
    const finish = (callback, value) => {
      if (finished) return;
      finished = true;
      signal?.removeEventListener('abort', onAbort);
      entry.users--;
      callback(value);
    };
    const onAbort = () => {
      finish(reject, aborted());
      if (entry.users === 0) {
        entry.controller.abort();
        if (pending.get(entry.key) === entry) pending.delete(entry.key);
      }
    };
    entry.promise.then((value) => finish(resolve, value), (err) => finish(reject, err));
    if (signal?.aborted) return onAbort();
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

function forTarget(value, coords) {
  if (!value) return value;
  const copy = JSON.parse(JSON.stringify(value));
  const target = { latitude: Number(coords.lat), longitude: Number(coords.lng) };
  if (copy.metadata) {
    copy.metadata.sourceLocation ||= copy.metadata.targetLocation || copy.metadata.requestedLocation;
    copy.metadata.targetLocation = target;
    if (copy.metadata.sourceLocation &&
        (copy.metadata.sourceLocation.latitude !== target.latitude || copy.metadata.sourceLocation.longitude !== target.longitude)) {
      const source = copy.metadata.sourceLocation;
      const dy = (source.latitude - target.latitude) * Math.PI / 180;
      const dx = (source.longitude - target.longitude) * Math.PI / 180;
      const a = Math.sin(dy / 2) ** 2 + Math.cos(target.latitude * Math.PI / 180) * Math.cos(source.latitude * Math.PI / 180) * Math.sin(dx / 2) ** 2;
      copy.metadata.distanceFromObservedMeters = Math.round(6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
      if (copy.metadata.spatialPrecision !== 'weather_model_grid') {
        copy.metadata.spatialPrecision = copy.isRegional ? 'regional_baseline' : 'approximate_grid_bucket';
        copy.warning = `Cached modeled soil profile approximately ${copy.metadata.distanceFromObservedMeters}m from this point; not an exact-site measurement.`;
      }
      copy.metadata.isExactSiteMeasurement = false;
    }
  }
  if (copy.isRegional) {
    copy.sampleTargetLocation ||= copy.targetLocation;
    copy.targetLocation = target;
    if (copy.sampleLocation) {
      const sample = copy.sampleLocation;
      const dy = (sample.latitude - target.latitude) * Math.PI / 180;
      const dx = (sample.longitude - target.longitude) * Math.PI / 180;
      const a = Math.sin(dy / 2) ** 2 + Math.cos(target.latitude * Math.PI / 180) * Math.cos(sample.latitude * Math.PI / 180) * Math.sin(dx / 2) ** 2;
      copy.distanceKm = Math.round(6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 10) / 10;
      const east = dx * Math.cos(target.latitude * Math.PI / 180);
      copy.direction = Math.abs(dy) >= Math.abs(east) ? (dy >= 0 ? 'North' : 'South') : (east >= 0 ? 'East' : 'West');
      copy.warning = `Regional soil baseline (${copy.distanceKm} km ${copy.direction} of site). Not an exact-site measurement; urban soil conditions may differ.`;
    }
  }
  return copy;
}

function cachedSection(section, coords) {
  const stored = cache.get(keyFor(section, coords));
  if (!stored) return null;
  const age = Date.now() - new Date(stored.value.verifiedAt || stored.fetchedAt).getTime();
  if (stored.value.data && section === 'weather' && age > 86400000) return null;
  return { ...stored, value: forTarget(stored.value, coords) };
}

async function loadSection(section, coords, { signal, force = false } = {}) {
  const key = keyFor(section, coords);
  const stored = cachedSection(section, coords);
  if (!force && stored && Date.now() < stored.expiresAt) return stored.value;
  let entry = pending.get(key);
  if (!entry) {
    const controller = new AbortController();
    entry = { key, controller, users: 0 };
    const query = new URLSearchParams({ lat: String(coords.lat), lng: String(coords.lng), section });
    entry.promise = apiClient.get(`/environment?${query}`, { signal: controller.signal })
      .then((response) => {
        const value = response.data[section];
        if (!value) throw new Error(`Missing ${section} response`);
        const now = Date.now();
        const ttl = value.data && !value.stale ? TTL[section] : Math.min(60000, Math.max(1000, (value.remainingCooldownSeconds || (value.reason === 'provider_busy' ? 1 : 10)) * 1000));
        const previous = cachedSection(section, coords);
        const chosen = !value.data && previous?.value.data
          ? { ...previous.value, stale: true, warning: `Live ${section} unavailable. Showing cached data.`, error: value.error }
          : value;
        const observed = new Date(chosen.verifiedAt || now).getTime();
        cache.delete(key);
        if (cache.size >= 500) cache.delete(cache.keys().next().value);
        cache.set(key, { value: chosen, fetchedAt: now, expiresAt: value.data && !value.stale ? Math.min(now + ttl, observed + TTL[section]) : now + ttl });
        return chosen;
      }).finally(() => { if (pending.get(key) === entry) pending.delete(key); });
    pending.set(key, entry);
  }
  return forTarget(await subscribe(entry, signal), coords);
}

/**
 * Cache-first environmental sections with independent updates and shared request cancellation.
 */
export const environmentService = {
  /**
   * Retrieves environmental assessment data for given coordinates.
   * Coalesces requests by provider bucket; onUpdate publishes each completed section.
   * @param {object} params
   * @param {number|string} params.lat - Latitude coordinate (-90 to 90)
   * @param {number|string} params.lng - Longitude coordinate (-180 to 180)
   * @param {object} [options] - signal, force and onUpdate callback
   * @returns {Promise<object>} Normalized environment payload
   */
  getCachedEnvironment(coords) {
    const result = { location: { latitude: coords.lat, longitude: coords.lng } };
    let found = false;
    for (const section of ['weather', 'soil']) {
      const stored = cachedSection(section, coords);
      found ||= Boolean(stored?.value.data);
      result[section] = stored?.value || { status: 'loading', data: null };
      if (stored?.value.data && Date.now() >= stored.expiresAt) {
        result[section] = { ...stored.value, stale: true, warning: `Refreshing cached ${section} data.` };
      }
    }
    return found ? result : null;
  },

  async getEnvironment(coords, { signal, onUpdate, force = false } = {}) {
    let result = this.getCachedEnvironment(coords) || {
      location: { latitude: coords.lat, longitude: coords.lng },
      weather: { status: 'loading', data: null }, soil: { status: 'loading', data: null },
    };
    onUpdate?.(result);
    await Promise.all(['weather', 'soil'].map(async (section) => {
      try {
        const value = await loadSection(section, coords, { signal, force });
        if (signal?.aborted) throw aborted();
        result = { ...result, [section]: value };
      } catch (err) {
        if (signal?.aborted || err.name === 'AbortError') throw err;
        const cached = cachedSection(section, coords)?.value;
        result = { ...result, [section]: cached?.data
          ? { ...cached, stale: true, warning: `Live ${section} unavailable. Showing cached data.` }
          : { status: 'unavailable', source: section === 'weather' ? 'Open-Meteo' : 'ISRIC SoilGrids', data: null, error: err.message } };
      }
      onUpdate?.(result);
    }));
    return result;
  },

  /**
   * Clears pending in-flight requests (used in tests).
   */
  _clearInFlight() {
    for (const entry of pending.values()) entry.controller.abort();
    pending.clear();
    cache.clear();
  },
};

export default environmentService;
