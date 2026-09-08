const { query } = require('../config/db');

class SuitabilityRepository {
  /**
   * Retrieves all canonical species suitability rules ordered by species name.
   * @returns {Promise<Array<object>>} List of suitability rule records
   */
  async findAllSpeciesRules() {
    const sql = `
      SELECT
        id,
        species,
        soil_type,
        min_spacing_m,
        sunlight,
        water_need,
        climate_region,
        created_at,
        updated_at
      FROM suitability_rules
      ORDER BY species ASC;
    `;
    const res = await query(sql);
    return res.rows;
  }

  /**
   * Retrieves a suitability rule record by species name (case-insensitive).
   * @param {string} speciesName - Name of the species to look up
   * @returns {Promise<object|null>} Suitability rule record or null
   */
  async findRuleBySpecies(speciesName) {
    const sql = `
      SELECT
        id,
        species,
        soil_type,
        min_spacing_m,
        sunlight,
        water_need,
        climate_region,
        created_at,
        updated_at
      FROM suitability_rules
      WHERE LOWER(TRIM(species)) = LOWER(TRIM($1))
      LIMIT 1;
    `;
    const res = await query(sql, [speciesName]);
    return res.rows.length > 0 ? res.rows[0] : null;
  }
}

module.exports = new SuitabilityRepository();
