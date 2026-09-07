const config = require('../config');

/**
 * Derives general USDA soil texture class based on clay, sand, and silt percentages.
 * @param {number|null} clay - Clay percentage (0-100)
 * @param {number|null} sand - Sand percentage (0-100)
 * @param {number|null} silt - Silt percentage (0-100)
 * @returns {string} Estimated soil texture classification
 */
const deriveSoilTexture = (clay, sand, silt) => {
  if (clay === null || sand === null || silt === null) {
    return 'Loam';
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
  constructor() {
    this.baseUrl = config.providers.soilGrids.baseUrl;
    this.timeoutMs = config.providers.soilGrids.timeoutMs;
  }

  /**
   * Fetches soil property information for given coordinates from ISRIC SoilGrids v2.0.
   * @param {object} coords
   * @param {number} coords.latitude - Latitude coordinate
   * @param {number} coords.longitude - Longitude coordinate
   * @returns {Promise<object>} Normalized soil section
   */
  async fetchSoil({ latitude, longitude }) {
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
        signal: AbortSignal.timeout(this.timeoutMs),
      });

      if (!response.ok) {
        return {
          status: 'unavailable',
          source: 'ISRIC SoilGrids',
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

      const ph = rawPh !== null ? Math.round((rawPh / 10) * 10) / 10 : null;
      const clayPercentage = rawClay !== null ? Math.round((rawClay / 10) * 10) / 10 : null;
      const sandPercentage = rawSand !== null ? Math.round((rawSand / 10) * 10) / 10 : null;
      const siltPercentage = rawSilt !== null ? Math.round((rawSilt / 10) * 10) / 10 : null;
      const organicCarbon = rawSoc !== null ? Math.round((rawSoc / 10) * 10) / 10 : null;

      const texture = deriveSoilTexture(clayPercentage, sandPercentage, siltPercentage);

      return {
        status: 'available',
        source: 'ISRIC SoilGrids',
        verifiedAt: new Date().toISOString(),
        data: {
          ph,
          clayPercentage,
          sandPercentage,
          siltPercentage,
          texture,
          organicCarbon,
          organicCarbonUnit: 'g/kg',
        },
      };
    } catch (err) {
      return {
        status: 'unavailable',
        source: 'ISRIC SoilGrids',
        verifiedAt: null,
        data: null,
        error: err.name === 'TimeoutError' ? 'Provider request timed out' : 'Provider connection failed',
      };
    }
  }
}

module.exports = new SoilGridsProvider();
