const treeRepository = require('../repositories/tree.repository');
const { BadRequestError, NotFoundError } = require('../utils/errors');

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
    if (isNaN(lat) || !isFinite(lat) || lat < -90 || lat > 90) {
      throw new BadRequestError(
        'Latitude must be a valid number between -90 and 90',
        'INVALID_COORDINATES'
      );
    }

    if (longitude === undefined || longitude === null || longitude === '') {
      throw new BadRequestError('Longitude is required', 'MISSING_COORDINATES');
    }
    const lng = typeof longitude === 'number' ? longitude : parseFloat(longitude);
    if (isNaN(lng) || !isFinite(lng) || lng < -180 || lng > 180) {
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

  /**
   * Retrieves verified trees inside a map viewport bounding envelope.
   * @param {object} query
   * @param {number|string} query.minLat - Minimum latitude
   * @param {number|string} query.minLng - Minimum longitude
   * @param {number|string} query.maxLat - Maximum latitude
   * @param {number|string} query.maxLng - Maximum longitude
   * @param {number|string} [query.page=1] - Page number
   * @param {number|string} [query.pageSize=50] - Page size (default 50, max 100)
   * @returns {Promise<{trees: Array<object>, pagination: object}>}
   */
  async getTreesInMapViewport({ minLat, minLng, maxLat, maxLng, page = 1, pageSize = 50 }) {
    if (minLat === undefined || minLat === null || minLat === '') {
      throw new BadRequestError('minLat is required', 'MISSING_COORDINATES');
    }
    if (minLng === undefined || minLng === null || minLng === '') {
      throw new BadRequestError('minLng is required', 'MISSING_COORDINATES');
    }
    if (maxLat === undefined || maxLat === null || maxLat === '') {
      throw new BadRequestError('maxLat is required', 'MISSING_COORDINATES');
    }
    if (maxLng === undefined || maxLng === null || maxLng === '') {
      throw new BadRequestError('maxLng is required', 'MISSING_COORDINATES');
    }

    const parsedMinLat = typeof minLat === 'number' ? minLat : parseFloat(minLat);
    const parsedMinLng = typeof minLng === 'number' ? minLng : parseFloat(minLng);
    const parsedMaxLat = typeof maxLat === 'number' ? maxLat : parseFloat(maxLat);
    const parsedMaxLng = typeof maxLng === 'number' ? maxLng : parseFloat(maxLng);

    if (
      isNaN(parsedMinLat) || !isFinite(parsedMinLat) || parsedMinLat < -90 || parsedMinLat > 90 ||
      isNaN(parsedMaxLat) || !isFinite(parsedMaxLat) || parsedMaxLat < -90 || parsedMaxLat > 90 ||
      isNaN(parsedMinLng) || !isFinite(parsedMinLng) || parsedMinLng < -180 || parsedMinLng > 180 ||
      isNaN(parsedMaxLng) || !isFinite(parsedMaxLng) || parsedMaxLng < -180 || parsedMaxLng > 180
    ) {
      throw new BadRequestError('Coordinates must be valid numbers within standard WGS84 range', 'INVALID_COORDINATES');
    }

    if (parsedMinLat > parsedMaxLat) {
      throw new BadRequestError('minLat cannot be greater than maxLat', 'INVALID_BOUNDS');
    }
    if (parsedMinLng > parsedMaxLng) {
      throw new BadRequestError('minLng cannot be greater than maxLng', 'INVALID_BOUNDS');
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(pageSize, 10) || 50));
    const offset = (pageNum - 1) * limit;

    const [rows, total] = await Promise.all([
      treeRepository.findInBoundingBox({
        minLng: parsedMinLng,
        minLat: parsedMinLat,
        maxLng: parsedMaxLng,
        maxLat: parsedMaxLat,
        limit,
        offset,
      }),
      treeRepository.countInBoundingBox({
        minLng: parsedMinLng,
        minLat: parsedMinLat,
        maxLng: parsedMaxLng,
        maxLat: parsedMaxLat,
      }),
    ]);

    const formattedTrees = rows.map((r) => ({
      treeId: r.treeId,
      species: r.species,
      latitude: parseFloat(r.latitude),
      longitude: parseFloat(r.longitude),
      status: r.status,
    }));

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

  /**
   * Retrieves verified trees nearby a center coordinate within radius in meters.
   * @param {object} query
   * @param {number|string} query.lat - Center latitude
   * @param {number|string} query.lng - Center longitude
   * @param {number|string} query.radiusMeters - Search radius in meters
   * @returns {Promise<{trees: Array<object>}>}
   */
  async getNearbyTrees({ lat, lng, radiusMeters }) {
    if (lat === undefined || lat === null || lat === '') {
      throw new BadRequestError('lat is required', 'MISSING_COORDINATES');
    }
    if (lng === undefined || lng === null || lng === '') {
      throw new BadRequestError('lng is required', 'MISSING_COORDINATES');
    }
    if (radiusMeters === undefined || radiusMeters === null || radiusMeters === '') {
      throw new BadRequestError('radiusMeters is required', 'MISSING_RADIUS');
    }

    const parsedLat = typeof lat === 'number' ? lat : parseFloat(lat);
    const parsedLng = typeof lng === 'number' ? lng : parseFloat(lng);
    const parsedRadius = typeof radiusMeters === 'number' ? radiusMeters : parseFloat(radiusMeters);

    if (isNaN(parsedLat) || !isFinite(parsedLat) || parsedLat < -90 || parsedLat > 90) {
      throw new BadRequestError('Latitude must be a valid number between -90 and 90', 'INVALID_COORDINATES');
    }
    if (isNaN(parsedLng) || !isFinite(parsedLng) || parsedLng < -180 || parsedLng > 180) {
      throw new BadRequestError('Longitude must be a valid number between -180 and 180', 'INVALID_COORDINATES');
    }
    if (isNaN(parsedRadius) || !isFinite(parsedRadius) || parsedRadius <= 0) {
      throw new BadRequestError('radiusMeters must be a positive number', 'INVALID_RADIUS');
    }
    if (parsedRadius > 50000) {
      throw new BadRequestError('radiusMeters exceeds maximum allowed search radius of 50000 meters', 'RADIUS_TOO_LARGE');
    }

    const rows = await treeRepository.findNearby({
      longitude: parsedLng,
      latitude: parsedLat,
      radiusMeters: parsedRadius,
    });

    const formattedTrees = rows.map((r) => ({
      treeId: r.treeId,
      species: r.species,
      latitude: parseFloat(r.latitude),
      longitude: parseFloat(r.longitude),
      distanceMeters: parseFloat(r.distanceMeters),
      status: r.status,
    }));

    return {
      trees: formattedTrees,
    };
  }

  /**
   * Retrieves the geographic location of a single verified tree by public Tree ID.
   * @param {string} treeId - Public Tree ID
   * @returns {Promise<{treeId: string, latitude: number, longitude: number}>}
   */
  async getTreeLocation(treeId) {
    if (!treeId || typeof treeId !== 'string' || treeId.trim() === '') {
      throw new BadRequestError('Tree ID is required', 'MISSING_TREE_ID');
    }

    const location = await treeRepository.findLocationByTreeId(treeId.trim());
    if (!location) {
      throw new NotFoundError('Verified tree with specified Tree ID not found', 'TREE_NOT_FOUND');
    }

    return {
      treeId: location.treeId,
      latitude: parseFloat(location.latitude),
      longitude: parseFloat(location.longitude),
    };
  }
}

module.exports = new TreeService();
