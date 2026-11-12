'use strict';

const config = require('../config');

const MAX_STALE_ENTRIES = 500;

/**
 * Computes an approximate localized WGS84 geographic spatial grid bucket (~250m nominal resolution).
 * 
 * SCIENTIFIC CAVEAT & PROJECTION NOTICE:
 * The official ISRIC SoilGrids v2.0 REST API operates on WGS84 coordinates but its underlying global
 * raster layers are projected in Interrupted Goode Homolosine (IGH / EPSG:152160). The REST API
 * does NOT expose internal raster cell identifiers or pixel coordinates in its GeoJSON response.
 * Converting WGS84 coordinates to exact Goode Homolosine raster cell coordinates requires full PROJ.4
 * interrupted lobe projection engines.
 * 
 * This calculation provides a conservative LOCALIZED WGS84 SPATIAL CACHE BUCKET (~250m nominal size)
 * to prevent duplicate outbound network requests and bound cache lifetime. It does NOT establish
 * authoritative SoilGrids internal raster-cell identity.
 * 
 * In WGS84 coordinates:
 * - 1 degree latitude ≈ 110,574 meters (constant meridional distance)
 * - deltaLat for nominal 250m = 250 / 110574 ≈ 0.00226093 degrees
 * - deltaLng for nominal 250m at latitude phi = 250 / (111320 * cos(phi)) degrees
 * 
 * @param {number} lat - Latitude in decimal degrees
 * @param {number} lng - Longitude in decimal degrees
 * @returns {{cellKey: string, cellIndexLat: number, cellIndexLng: number, snappedLat: number, snappedLng: number, isExactRasterCell: false, spatialMethod: string, nominalResolution: string}}
 */
const computeApproxSpatialCell = (lat, lng) => {
  const parsedLat = Number(lat);
  const parsedLng = Number(lng);
  const deltaLat = 250.0 / 110574.0; // ~0.00226093 degrees
  const cosLat = Math.cos((parsedLat * Math.PI) / 180.0);
  const deltaLng = Math.abs(cosLat) > 0.001 ? 250.0 / (111320.0 * Math.abs(cosLat)) : deltaLat;

  const cellIndexLat = Math.floor(parsedLat / deltaLat);
  const cellIndexLng = Math.floor(parsedLng / deltaLng);

  const snappedLat = Number(((cellIndexLat + 0.5) * deltaLat).toFixed(5));
  const snappedLng = Number(((cellIndexLng + 0.5) * deltaLng).toFixed(5));

  return {
    cellKey: `c${cellIndexLat}:${cellIndexLng}`,
    cellIndexLat,
    cellIndexLng,
    snappedLat,
    snappedLng,
    isExactRasterCell: false,
    spatialMethod: 'approximate_wgs84_grid_bucket',
    nominalResolution: '~250m (localized WGS84 approximation)',
  };
};

// Backwards-compatible alias for existing callers
const compute250mRasterCell = (lat, lng) => computeApproxSpatialCell(lat, lng);

/**
 * Derives general USDA soil texture class based on clay, sand, and silt percentages.
 * Returns null if any required physical measurement is missing.
 * @param {number|null} clay - Clay percentage (0-100)
 * @param {number|null} sand - Sand percentage (0-100)
 * @param {number|null} silt - Silt percentage (0-100)
 * @returns {string|null} Estimated soil texture classification or null
 */
const deriveSoilTexture = (clay, sand, silt) => {
  if (
    clay === null || sand === null || silt === null ||
    clay === undefined || sand === undefined || silt === undefined ||
    typeof clay !== 'number' || typeof sand !== 'number' || typeof silt !== 'number'
  ) {
    return null;
  }
  if (clay >= 40) return 'Clay';
  if (sand >= 85) return 'Sand';
  if (sand >= 70) return 'Loamy sand';
  if (silt >= 80) return 'Silt';
  if (clay >= 27 && clay < 40 && sand <= 20) return 'Silty clay loam';
  if (clay >= 27 && clay < 40 && sand >= 20 && sand <= 45) return 'Clay loam';
  if (clay >= 20 && clay < 35 && silt < 28 && sand >= 45) return 'Sandy clay loam';
  if (silt >= 50 && (clay >= 12 && clay < 27)) return 'Silt loam';
  if (sand >= 52 && (silt + 1.5 * clay) < 50) return 'Sandy loam';
  return 'Loam';
};

class SoilGridsProvider {
  constructor(deps = {}) {
    this.baseUrl = deps.baseUrl || config.providers.soilGrids.baseUrl;
    this.timeoutMs = deps.timeoutMs || config.providers.soilGrids.timeoutMs || 25000;
    this.staleSoilMap = new Map();
  }

  /**
   * Normalizes coordinates to 2 decimal places for legacy tests.
   * @param {number} lat
   * @param {number} lng
   * @returns {string}
   */
  normalizeCoords(lat, lng) {
    return `${Number(lat).toFixed(2)}:${Number(lng).toFixed(2)}`;
  }

  /**
   * Computes an approximate localized WGS84 spatial grid bucket (~250m nominal resolution).
   * @param {number} lat
   * @param {number} lng
   * @returns {object}
   */
  computeApproxSpatialCell(lat, lng) {
    return computeApproxSpatialCell(lat, lng);
  }

  /**
   * Backwards-compatible alias for approximate spatial cell.
   * @param {number} lat
   * @param {number} lng
   * @returns {object}
   */
  compute250mRasterCell(lat, lng) {
    return compute250mRasterCell(lat, lng);
  }

  /**
   * Computes the 250m raster cell key for a given coordinate.
   * @param {number} lat
   * @param {number} lng
   * @returns {string} e.g. "c13556:29412"
   */
  get250mCellKey(lat, lng) {
    return compute250mRasterCell(lat, lng).cellKey;
  }

  /**
   * Clears in-memory stale soil cache (used for testing).
   */
  clearStaleCache() {
    this.staleSoilMap.clear();
  }

  /**
   * Stores successful soil result in in-memory stale cache with bounded size.
   * @param {string} key
   * @param {object} data
   */
  saveStale(key, data) {
    if (this.staleSoilMap.size >= MAX_STALE_ENTRIES) {
      const firstKey = this.staleSoilMap.keys().next().value;
      if (firstKey) this.staleSoilMap.delete(firstKey);
    }
    this.staleSoilMap.set(key, data);
  }

  /**
   * Fetches soil property information for given coordinates from ISRIC SoilGrids v2.0.
   * @param {object} coords
   * @param {number} coords.latitude - Latitude coordinate
   * @param {number} coords.longitude - Longitude coordinate
   * @returns {Promise<object>} Normalized soil section
   */
  async fetchSoil({ latitude, longitude }) {
    const { cellKey, snappedLat, snappedLng } = compute250mRasterCell(latitude, longitude);

    try {
      const url = new URL(this.baseUrl);
      url.searchParams.set('lat', latitude.toString());
      url.searchParams.set('lon', longitude.toString());
      url.searchParams.append('property', 'phh2o');
      url.searchParams.append('property', 'clay');
      url.searchParams.append('property', 'sand');
      url.searchParams.append('property', 'silt');
      url.searchParams.append('property', 'soc');
      url.searchParams.append('depth', '0-5cm');
      url.searchParams.append('value', 'mean');

      const response = await fetch(url.toString(), {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'EcoRevive-UrbanPlantation/1.0 (+https://ecorevive.org; contact@ecorevive.org)',
        },
        signal: AbortSignal.timeout(this.timeoutMs),
      });

      if (!response.ok) {
        const stale = this.staleSoilMap.get(cellKey);
        if (stale) {
          return {
            ...stale,
            stale: true,
            warning: `Provider responded with status ${response.status}. Serving cached soil properties.`,
          };
        }

        return {
          status: 'unavailable',
          source: 'ISRIC SoilGrids',
          reason: response.status === 429 ? 'rate_limit' : 'provider_error',
          verifiedAt: null,
          data: null,
          error: `Provider responded with status ${response.status}`,
        };
      }

      const json = await response.json();
      const layers = json.properties?.layers || [];

      // Helper to extract mean value for a layer
      const extractLayerMean = (layerName) => {
        const layer = layers.find((l) => l.name === layerName);
        if (!layer || !Array.isArray(layer.depths) || layer.depths.length === 0) {
          return null;
        }
        const depth = layer.depths[0];
        return typeof depth.values?.mean === 'number' ? depth.values.mean : null;
      };

      const rawPh = extractLayerMean('phh2o');
      const rawClay = extractLayerMean('clay');
      const rawSand = extractLayerMean('sand');
      const rawSilt = extractLayerMean('silt');
      const rawSoc = extractLayerMean('soc');

      // Detect when all primary soil measurements are null (ISRIC global urban/water NoData mask)
      const allPrimaryNull =
        rawPh === null &&
        rawClay === null &&
        rawSand === null &&
        rawSilt === null &&
        rawSoc === null;

      if (allPrimaryNull) {
        // Do NOT save NoData responses to stale cache
        return {
          status: 'unavailable',
          source: 'ISRIC SoilGrids',
          reason: 'urban_mask',
          verifiedAt: null,
          data: null,
          error: 'Location is within an urban built-up area or water body masked by ISRIC SoilGrids',
        };
      }

      const ph = rawPh !== null ? Math.round((rawPh / 10) * 10) / 10 : null;
      const clayPercentage = rawClay !== null ? Math.round((rawClay / 10) * 10) / 10 : null;
      const sandPercentage = rawSand !== null ? Math.round((rawSand / 10) * 10) / 10 : null;
      const siltPercentage = rawSilt !== null ? Math.round((rawSilt / 10) * 10) / 10 : null;
      const organicCarbon = rawSoc !== null ? Math.round((rawSoc / 10) * 10) / 10 : null;

      const texture = deriveSoilTexture(clayPercentage, sandPercentage, siltPercentage);

      const result = {
        status: 'available',
        source: 'ISRIC SoilGrids',
        verifiedAt: new Date().toISOString(),
        stale: false,
        data: {
          ph,
          clayPercentage,
          sandPercentage,
          siltPercentage,
          texture,
          organicCarbon,
          organicCarbonUnit: 'g/kg',
        },
        metadata: {
          spatialPrecision: 'exact_query_coordinates',
          isExactRasterCell: false,
          spatialMethod: 'approximate_wgs84_grid_bucket',
          nominalResolution: '~250m (localized WGS84 approximation)',
          cellKey,
          gridCenter: { latitude: snappedLat, longitude: snappedLng },
          targetLocation: { latitude: Number(latitude), longitude: Number(longitude) },
          providerCoordinates: json.geometry?.coordinates
            ? { longitude: json.geometry.coordinates[0], latitude: json.geometry.coordinates[1] }
            : null,
        },
      };

      // Save to in-memory stale cache
      this.saveStale(cellKey, result);

      return result;
    } catch (err) {
      const stale = this.staleSoilMap.get(cellKey);
      if (stale) {
        return {
          ...stale,
          stale: true,
          warning: `SoilGrids request failed (${err.message}). Serving cached soil properties.`,
        };
      }

      return {
        status: 'unavailable',
        source: 'ISRIC SoilGrids',
        reason: err.name === 'TimeoutError' ? 'timeout' : 'connection_error',
        verifiedAt: null,
        data: null,
        error: err.name === 'TimeoutError' ? 'Provider request timed out' : 'Provider connection failed',
      };
    }
  }
}

const soilGridsProvider = new SoilGridsProvider();
soilGridsProvider.SoilGridsProvider = SoilGridsProvider;
soilGridsProvider.deriveSoilTexture = deriveSoilTexture;
soilGridsProvider.computeApproxSpatialCell = computeApproxSpatialCell;
soilGridsProvider.compute250mRasterCell = compute250mRasterCell;

module.exports = soilGridsProvider;
