const treeRepository = require('../repositories/tree.repository');
const { BadRequestError } = require('../utils/errors');

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

class TreeService {
  /**
   * Helper to format a tree record according to the API specification contract.
   * @param {object} row - Database row
   * @returns {object} Formatted tree object
   */
  formatTree(row) {
    let plantedOnStr = row.planted_on;
    if (row.planted_on instanceof Date) {
      const year = row.planted_on.getFullYear();
      const month = String(row.planted_on.getMonth() + 1).padStart(2, '0');
      const day = String(row.planted_on.getDate()).padStart(2, '0');
      plantedOnStr = `${year}-${month}-${day}`;
    } else if (typeof row.planted_on === 'string') {
      plantedOnStr = row.planted_on.split('T')[0];
    }

    return {
      id: row.id,
      treeId: row.tree_id || null,
      species: row.species,
      latitude: parseFloat(row.latitude),
      longitude: parseFloat(row.longitude),
      plantedOn: plantedOnStr,
      status: row.status,
      photoReference: row.photo_reference || null,
      createdAt: row.created_at,
    };
  }

  /**
   * Registers a new tree plantation record.
   * @param {object} input
   * @param {string} input.species - Species name
   * @param {number|string} input.latitude - Latitude coordinate
   * @param {number|string} input.longitude - Longitude coordinate
   * @param {string} input.plantedOn - Planting date (YYYY-MM-DD)
   * @param {string|null} [input.photoReference=null] - Photo file reference
   * @param {string} input.contributorId - Authenticated contributor UUID
   * @returns {Promise<object>} Formatted tree record
   */
  async registerPlantation({
    species,
    latitude,
    longitude,
    plantedOn,
    photoReference = null,
    contributorId,
  }) {
    if (!species || typeof species !== 'string' || species.trim() === '') {
      throw new BadRequestError('Species is required', 'MISSING_SPECIES');
    }

    if (latitude === undefined || latitude === null || latitude === '') {
      throw new BadRequestError('Latitude is required', 'MISSING_COORDINATES');
    }
    const lat = typeof latitude === 'number' ? latitude : parseFloat(latitude);
    if (isNaN(lat) || lat < -90 || lat > 90) {
      throw new BadRequestError(
        'Latitude must be a valid number between -90 and 90',
        'INVALID_COORDINATES'
      );
    }

    if (longitude === undefined || longitude === null || longitude === '') {
      throw new BadRequestError('Longitude is required', 'MISSING_COORDINATES');
    }
    const lng = typeof longitude === 'number' ? longitude : parseFloat(longitude);
    if (isNaN(lng) || lng < -180 || lng > 180) {
      throw new BadRequestError(
        'Longitude must be a valid number between -180 and 180',
        'INVALID_COORDINATES'
      );
    }

    if (!plantedOn || typeof plantedOn !== 'string' || plantedOn.trim() === '') {
      throw new BadRequestError('Planting date is required', 'MISSING_PLANTED_DATE');
    }
    const trimmedDate = plantedOn.trim();
    const parsedDate = new Date(trimmedDate);
    if (isNaN(parsedDate.getTime())) {
      throw new BadRequestError('Invalid planting date format', 'INVALID_PLANTED_DATE');
    }
    // If format is YYYY-MM-DD, use it directly, otherwise convert to ISO date string
    const formattedDate = DATE_REGEX.test(trimmedDate)
      ? trimmedDate
      : parsedDate.toISOString().split('T')[0];

    if (!contributorId) {
      throw new BadRequestError('Contributor ID is required', 'MISSING_CONTRIBUTOR');
    }

    const created = await treeRepository.create({
      species: species.trim(),
      latitude: lat,
      longitude: lng,
      plantedOn: formattedDate,
      photoReference,
      contributorId,
    });

    return this.formatTree(created);
  }

  /**
   * Retrieves paginated list of plantations registered by the authenticated contributor.
   * @param {string} contributorId - Authenticated contributor UUID
   * @param {object} query
   * @param {number|string} [query.page=1] - Page number
   * @param {number|string} [query.pageSize=20] - Records per page
   * @returns {Promise<{trees: Array<object>, pagination: object}>}
   */
  async getMyPlantations(contributorId, { page = 1, pageSize = 20 } = {}) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(pageSize, 10) || 20));
    const offset = (pageNum - 1) * limit;

    const [rows, total] = await Promise.all([
      treeRepository.findByContributorId(contributorId, { limit, offset }),
      treeRepository.countByContributorId(contributorId),
    ]);

    const formattedTrees = rows.map((r) => this.formatTree(r));
    const totalPages = Math.ceil(total / limit) || 1;

    return {
      trees: formattedTrees,
      pagination: {
        page: pageNum,
        pageSize: limit,
        total,
        totalPages,
      },
    };
  }
}

module.exports = new TreeService();
