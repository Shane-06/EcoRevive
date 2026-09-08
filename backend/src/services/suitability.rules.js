/**
 * EcoRevive Milestone 8: Rule-Based Suitability Engine Definitions
 * Strictly implements the Frozen Decision Record v1.1.
 */

const SUITABILITY_STATUS = Object.freeze({
  SUITABLE: 'suitable',
  MODERATE: 'moderate',
  UNSUITABLE: 'unsuitable',
  INSUFFICIENT_DATA: 'insufficient_data',
});

/**
 * Deterministic mapping of database soil_type rules to accepted USDA texture classes.
 * M7 SoilGrids returns one of:
 * ['Clay', 'Sand', 'Loamy sand', 'Silt', 'Silty clay loam', 'Clay loam', 'Sandy clay loam', 'Silt loam', 'Sandy loam', 'Loam']
 */
const TEXTURE_MAPPINGS = Object.freeze({
  'Well-drained loam': {
    suitable: ['Loam', 'Sandy loam', 'Silt loam', 'Clay loam', 'Sandy clay loam'],
    moderate: ['Loamy sand', 'Silty clay loam', 'Silt'],
    unsuitable: ['Sand', 'Clay'],
  },
  'Alluvial / loam': {
    suitable: ['Loam', 'Silt loam', 'Clay loam', 'Sandy loam', 'Silty clay loam', 'Silt', 'Sandy clay loam'],
    moderate: ['Loamy sand', 'Clay'],
    unsuitable: ['Sand'],
  },
  'Well-drained clay-loam': {
    suitable: ['Clay loam', 'Loam', 'Sandy clay loam', 'Silty clay loam'],
    moderate: ['Sandy loam', 'Silt loam', 'Clay', 'Silt'],
    unsuitable: ['Sand', 'Loamy sand'],
  },
  'Deep loam': {
    suitable: ['Loam', 'Sandy loam', 'Clay loam', 'Silt loam', 'Sandy clay loam'],
    moderate: ['Loamy sand', 'Silty clay loam', 'Silt'],
    unsuitable: ['Clay', 'Sand'],
  },
  'Loam / clay, near water': {
    suitable: ['Clay loam', 'Loam', 'Clay', 'Silty clay loam', 'Silt loam'],
    moderate: ['Sandy clay loam', 'Sandy loam', 'Silt'],
    unsuitable: ['Sand', 'Loamy sand'],
  },
  'Sandy loam / alluvial': {
    suitable: ['Sandy loam', 'Loam', 'Sandy clay loam', 'Loamy sand', 'Silt loam'],
    moderate: ['Clay loam', 'Silt', 'Silty clay loam'],
    unsuitable: ['Clay', 'Sand'],
  },
  'Sandy loam': {
    suitable: ['Sandy loam', 'Loam', 'Loamy sand', 'Sandy clay loam'],
    moderate: ['Silt loam', 'Clay loam', 'Silt'],
    unsuitable: ['Clay', 'Silty clay loam', 'Sand'],
  },
  'Riverbank / alluvial loam': {
    suitable: ['Loam', 'Clay loam', 'Silt loam', 'Silty clay loam', 'Sandy clay loam'],
    moderate: ['Clay', 'Sandy loam', 'Silt'],
    unsuitable: ['Sand', 'Loamy sand'],
  },
});

/**
 * Evaluates soil pH against conservative biological tolerance bands for canonical species.
 * @param {number|null} ph - Topsoil pH (0-5cm)
 * @returns {string} SUITABILITY_STATUS
 */
const evaluatePh = (ph) => {
  if (ph === null || ph === undefined || typeof ph !== 'number' || isNaN(ph)) {
    return SUITABILITY_STATUS.INSUFFICIENT_DATA;
  }
  if (ph >= 6.0 && ph <= 7.8) {
    return SUITABILITY_STATUS.SUITABLE;
  }
  if ((ph >= 5.5 && ph < 6.0) || (ph > 7.8 && ph <= 8.5)) {
    return SUITABILITY_STATUS.MODERATE;
  }
  return SUITABILITY_STATUS.UNSUITABLE;
};

/**
 * Evaluates USDA soil texture against the exact rule mapping for the species.
 * @param {string} ruleSoilType - Database soil_type string
 * @param {string|null} soilTexture - SoilGrids USDA texture string
 * @returns {string} SUITABILITY_STATUS
 */
const evaluateTexture = (ruleSoilType, soilTexture) => {
  if (!soilTexture || typeof soilTexture !== 'string') {
    return SUITABILITY_STATUS.INSUFFICIENT_DATA;
  }
  const mapping = TEXTURE_MAPPINGS[ruleSoilType];
  if (!mapping) {
    return SUITABILITY_STATUS.INSUFFICIENT_DATA;
  }
  if (mapping.suitable.includes(soilTexture)) {
    return SUITABILITY_STATUS.SUITABLE;
  }
  if (mapping.moderate.includes(soilTexture)) {
    return SUITABILITY_STATUS.MODERATE;
  }
  if (mapping.unsuitable.includes(soilTexture)) {
    return SUITABILITY_STATUS.UNSUITABLE;
  }
  return SUITABILITY_STATUS.UNSUITABLE;
};

/**
 * Evaluates the Soil component combining pH and texture with intra-component precedence.
 * Precedence: unsuitable > moderate > suitable
 * @param {object} rule - Suitability rule record
 * @param {object} soilSection - Normalized soil section from M7 environment service
 * @returns {{status: string, reason: string}}
 */
const evaluateSoil = (rule, soilSection) => {
  if (!soilSection || soilSection.status === 'unavailable' || !soilSection.data) {
    return {
      status: SUITABILITY_STATUS.INSUFFICIENT_DATA,
      reason: 'Soil data unavailable from external provider (ISRIC SoilGrids). Cannot evaluate soil compatibility.',
    };
  }

  const { ph, texture } = soilSection.data;
  const phStatus = evaluatePh(ph);
  const textureStatus = evaluateTexture(rule.soil_type, texture);

  if (phStatus === SUITABILITY_STATUS.INSUFFICIENT_DATA || textureStatus === SUITABILITY_STATUS.INSUFFICIENT_DATA) {
    return {
      status: SUITABILITY_STATUS.INSUFFICIENT_DATA,
      reason: 'Incomplete soil properties from external provider (ISRIC SoilGrids). Cannot evaluate soil compatibility.',
    };
  }

  // Precedence within soil component: unsuitable > moderate > suitable
  let status = SUITABILITY_STATUS.SUITABLE;
  if (phStatus === SUITABILITY_STATUS.UNSUITABLE || textureStatus === SUITABILITY_STATUS.UNSUITABLE) {
    status = SUITABILITY_STATUS.UNSUITABLE;
  } else if (phStatus === SUITABILITY_STATUS.MODERATE || textureStatus === SUITABILITY_STATUS.MODERATE) {
    status = SUITABILITY_STATUS.MODERATE;
  } else {
    status = SUITABILITY_STATUS.SUITABLE;
  }

  let reason = '';
  if (status === SUITABILITY_STATUS.SUITABLE) {
    reason = `Soil pH ${ph} and texture ${texture} are compatible with ${rule.species} requirements (${rule.soil_type}). Indicative V1 estimate from SoilGrids (0-5cm depth); does not replace on-site soil testing.`;
  } else if (status === SUITABILITY_STATUS.MODERATE) {
    const phNote = phStatus === SUITABILITY_STATUS.MODERATE ? `pH ${ph} presents mild stress` : `pH ${ph} is compatible`;
    const textNote = textureStatus === SUITABILITY_STATUS.MODERATE ? `texture ${texture} is sub-optimal for ${rule.soil_type}` : `texture ${texture} is compatible`;
    reason = `Soil conditions are moderately suitable for ${rule.species}: ${phNote}, ${textNote}. Indicative V1 estimate from SoilGrids (0-5cm depth); does not replace on-site soil testing.`;
  } else {
    const unsuitableFactors = [];
    if (phStatus === SUITABILITY_STATUS.UNSUITABLE) unsuitableFactors.push(`pH ${ph} is outside biological tolerance`);
    if (textureStatus === SUITABILITY_STATUS.UNSUITABLE) unsuitableFactors.push(`texture ${texture} is incompatible with ${rule.soil_type}`);
    reason = `Soil is unsuitable for ${rule.species}: ${unsuitableFactors.join('; ')}. Indicative V1 estimate from SoilGrids (0-5cm depth); does not replace on-site soil testing.`;
  }

  return { status, reason };
};

/**
 * Evaluates the Sunlight component based on open-canopy requirements and M7 weather data.
 * @param {object} rule - Suitability rule record
 * @param {object} weatherSection - Normalized weather section from M7 environment service
 * @returns {{status: string, reason: string}}
 */
const evaluateSunlight = (rule, weatherSection) => {
  if (!weatherSection || weatherSection.status === 'unavailable' || !weatherSection.data) {
    return {
      status: SUITABILITY_STATUS.INSUFFICIENT_DATA,
      reason: 'Weather and solar data unavailable from external provider (Open-Meteo). Cannot evaluate sunlight suitability.',
    };
  }

  const { condition, weatherCode } = weatherSection.data;
  const conditionStr = condition || 'Unknown';
  const codeStr = weatherCode !== null && weatherCode !== undefined ? `WMO code ${weatherCode}` : 'unknown code';

  return {
    status: SUITABILITY_STATUS.SUITABLE,
    reason: `Location meets open sunlight requirements (${rule.sunlight}). Current weather: ${conditionStr} (${codeStr}). Indicative V1 assessment based on general canopy requirements; long-term solar irradiance, photoperiod, and local shade obstacles are not measured.`,
  };
};

/**
 * Evaluates the Water component based on species water need against precipitation and humidity.
 * @param {object} rule - Suitability rule record
 * @param {object} weatherSection - Normalized weather section from M7 environment service
 * @returns {{status: string, reason: string}}
 */
const evaluateWater = (rule, weatherSection) => {
  if (!weatherSection || weatherSection.status === 'unavailable' || !weatherSection.data) {
    return {
      status: SUITABILITY_STATUS.INSUFFICIENT_DATA,
      reason: 'Precipitation and atmospheric moisture data unavailable from external provider (Open-Meteo). Cannot evaluate water suitability.',
    };
  }

  const { humidity, precipitation } = weatherSection.data;
  const humidityVal = typeof humidity === 'number' ? humidity : 0;
  const precipVal = typeof precipitation === 'number' ? precipitation : 0;
  const waterNeed = rule.water_need || 'Moderate';

  let status = SUITABILITY_STATUS.SUITABLE;
  let reason = '';

  if (waterNeed === 'Low') {
    if (humidityVal >= 15) {
      status = SUITABILITY_STATUS.SUITABLE;
      reason = `Low water requirement is supported under ambient humidity ${humidityVal}% and ${precipVal}mm precipitation. Indicative V1 assessment; does not verify groundwater table or on-site irrigation access.`;
    } else {
      status = SUITABILITY_STATUS.MODERATE;
      reason = `Extremely arid conditions (humidity ${humidityVal}%); initial watering recommended for Low water need species ${rule.species}. Indicative V1 assessment; does not verify groundwater table or on-site irrigation access.`;
    }
  } else if (waterNeed === 'High') {
    if (humidityVal >= 50 || precipVal > 2) {
      status = SUITABILITY_STATUS.SUITABLE;
      reason = `High water requirement is supported under ambient humidity ${humidityVal}% and ${precipVal}mm precipitation. Indicative V1 assessment; riparian proximity or regular irrigation recommended.`;
    } else {
      status = SUITABILITY_STATUS.MODERATE;
      reason = `Ambient moisture (humidity ${humidityVal}%, precipitation ${precipVal}mm) is low for High water need species ${rule.species}; regular supplemental irrigation or riparian access is required. Indicative V1 assessment; does not verify groundwater table or on-site irrigation access.`;
    }
  } else {
    // Moderate, Moderate-High, Low-Moderate
    if (humidityVal >= 35 || precipVal > 0) {
      status = SUITABILITY_STATUS.SUITABLE;
      reason = `Moderate water requirement is supported under ambient humidity ${humidityVal}% and ${precipVal}mm precipitation. Indicative V1 assessment; does not verify groundwater table or on-site irrigation access.`;
    } else {
      status = SUITABILITY_STATUS.MODERATE;
      reason = `Dry ambient conditions (humidity ${humidityVal}%, precipitation ${precipVal}mm) for ${waterNeed} water need species ${rule.species}; supplemental watering recommended during sapling establishment. Indicative V1 assessment; does not verify groundwater table or on-site irrigation access.`;
    }
  }

  return { status, reason };
};

/**
 * Evaluates the Spacing component as an advisory requirement.
 * @param {object} rule - Suitability rule record
 * @returns {{status: string, reason: string}}
 */
const evaluateSpacing = (rule) => {
  const spacingNum = parseFloat(rule.min_spacing_m).toFixed(2);
  return {
    status: SUITABILITY_STATUS.SUITABLE,
    reason: `Advisory requirement: ${rule.species} requires a minimum spacing of ${spacingNum} meters between adjacent trees and structures. Physical spacing must be verified on-site during planting.`,
  };
};

/**
 * Evaluates overall suitability following the frozen precedence rule:
 * unsuitable > insufficient_data > moderate > suitable
 * @param {object} checks - Individual component check results
 * @param {string} species - Species name
 * @returns {{status: string, explanation: string}}
 */
const evaluateOverall = (checks, species) => {
  const statuses = [
    checks.soil.status,
    checks.sunlight.status,
    checks.water.status,
    checks.spacing.status,
  ];

  if (statuses.includes(SUITABILITY_STATUS.UNSUITABLE)) {
    return {
      status: SUITABILITY_STATUS.UNSUITABLE,
      explanation: `One or more environmental parameters are incompatible with the biological requirements of ${species}. Review individual checks for details.`,
    };
  }

  if (statuses.includes(SUITABILITY_STATUS.INSUFFICIENT_DATA)) {
    return {
      status: SUITABILITY_STATUS.INSUFFICIENT_DATA,
      explanation: `One or more environmental data sources were unavailable. Overall suitability cannot be reliably determined without complete environmental data.`,
    };
  }

  if (statuses.includes(SUITABILITY_STATUS.MODERATE)) {
    return {
      status: SUITABILITY_STATUS.MODERATE,
      explanation: `Environmental conditions are moderately suitable for ${species}. Certain parameters may require attention or site management.`,
    };
  }

  return {
    status: SUITABILITY_STATUS.SUITABLE,
    explanation: `All evaluated environmental parameters meet the baseline deterministic suitability rules for ${species}. Note: This is an indicative V1 decision-support tool, not professional forestry certification or legal plantation authorization.`,
  };
};

module.exports = {
  SUITABILITY_STATUS,
  TEXTURE_MAPPINGS,
  evaluatePh,
  evaluateTexture,
  evaluateSoil,
  evaluateSunlight,
  evaluateWater,
  evaluateSpacing,
  evaluateOverall,
};
