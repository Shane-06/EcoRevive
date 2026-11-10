const treeService = require('../services/tree.service');
const storageService = require('../services/storage.service');
const treeHealthRepository = require('../repositories/treeHealth.repository');
const { sendSuccess } = require('../utils/apiResponse');
const { NotFoundError, ForbiddenError, BadRequestError } = require('../utils/errors');

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
        resolvedPhotoRef = await storageService.uploadFile({
          file: req.file,
          prefix: 'trees',
        });
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

  /**
   * Handles GET /api/v1/trees/:treeId/photo
   * Generates an authorized, short-lived signed URL to view plantation photo evidence.
   * Access: Protected (Owner contributor, Admin, or Caretaker).
   */
  async getTreePhoto(req, res, next) {
    try {
      const { treeId } = req.params;
      if (!treeId) {
        throw new BadRequestError('Tree ID is required', 'MISSING_TREE_ID');
      }

      const tree = await treeHealthRepository.findTreeByIdentifier(treeId);
      if (!tree) {
        throw new NotFoundError(`Tree '${treeId}' not found`, 'TREE_NOT_FOUND');
      }

      const isOwner = req.user && req.user.id === tree.contributor_id;
      const isAdmin = req.user && req.user.role === 'admin';
      const isCaretaker = req.user && req.user.role === 'caretaker';

      if (!isOwner && !isAdmin && !isCaretaker) {
        throw new ForbiddenError(
          'You are not authorized to view this plantation photo evidence',
          'UNAUTHORIZED_PHOTO_ACCESS'
        );
      }

      if (!tree.photo_reference) {
        throw new NotFoundError(
          `No photo evidence on record for tree '${treeId}'`,
          'PHOTO_NOT_FOUND'
        );
      }

      const signedUrl = await storageService.getSignedUrl(tree.photo_reference);

      return sendSuccess(res, {
        treeId: tree.tree_id || tree.id,
        photoReference: tree.photo_reference,
        photoUrl: signedUrl,
      }, 200);
    } catch (err) {
      return next(err);
    }
  }
}

module.exports = new TreeController();
