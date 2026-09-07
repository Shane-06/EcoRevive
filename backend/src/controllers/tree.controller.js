const treeService = require('../services/tree.service');
const { sendSuccess } = require('../utils/apiResponse');

/**
 * Controller for Tree / Plantation operations.
 */
class TreeController {
  /**
   * Handles POST /api/v1/trees
   * Registers a new plantation record.
   */
  async createTree(req, res, next) {
    try {
      const {
        species,
        latitude,
        lat,
        longitude,
        lng,
        plantedOn,
        planted_on,
        photoReference,
        photo_reference,
      } = req.body;

      let resolvedPhotoRef = photoReference || photo_reference || null;
      if (req.file) {
        resolvedPhotoRef = `uploads/${req.file.filename}`;
      }

      const tree = await treeService.registerPlantation({
        species,
        latitude: latitude !== undefined ? latitude : lat,
        longitude: longitude !== undefined ? longitude : lng,
        plantedOn: plantedOn || planted_on,
        photoReference: resolvedPhotoRef,
        contributorId: req.user.id,
      });

      return sendSuccess(res, { tree }, 201);
    } catch (err) {
      return next(err);
    }
  }

  /**
   * Handles GET /api/v1/trees/mine
   * Retrieves paginated plantations registered by the authenticated contributor.
   */
  async getMyTrees(req, res, next) {
    try {
      const { page, pageSize } = req.query;
      const result = await treeService.getMyPlantations(req.user.id, {
        page,
        pageSize,
      });

      return sendSuccess(res, result, 200);
    } catch (err) {
      return next(err);
    }
  }

  /**
   * Handles GET /api/v1/trees/map
   * Retrieves verified trees within a map bounding box viewport.
   */
  async getMapTrees(req, res, next) {
    try {
      const { minLat, minLng, maxLat, maxLng, page, pageSize } = req.query;
      const result = await treeService.getTreesInMapViewport({
        minLat,
        minLng,
        maxLat,
        maxLng,
        page,
        pageSize,
      });

      return sendSuccess(res, result, 200);
    } catch (err) {
      return next(err);
    }
  }

  /**
   * Handles GET /api/v1/trees/nearby
   * Retrieves verified trees within radius in meters of a coordinate.
   */
  async getNearbyTrees(req, res, next) {
    try {
      const { lat, lng, radiusMeters } = req.query;
      const result = await treeService.getNearbyTrees({
        lat,
        lng,
        radiusMeters,
      });

      return sendSuccess(res, result, 200);
    } catch (err) {
      return next(err);
    }
  }

  /**
   * Handles GET /api/v1/trees/:treeId/location
   * Retrieves the geographic location of a single public verified tree.
   */
  async getTreeLocation(req, res, next) {
    try {
      const { treeId } = req.params;
      const result = await treeService.getTreeLocation(treeId);

      return sendSuccess(res, result, 200);
    } catch (err) {
      return next(err);
    }
  }
}

module.exports = new TreeController();
