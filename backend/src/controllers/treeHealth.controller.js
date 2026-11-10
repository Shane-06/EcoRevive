const treeHealthService = require('../services/treeHealth.service');
const treeHealthRepository = require('../repositories/treeHealth.repository');
const storageService = require('../services/storage.service');
const { sendSuccess } = require('../utils/apiResponse');
const { NotFoundError, ForbiddenError, BadRequestError } = require('../utils/errors');

class TreeHealthController {
  /**
   * Handles POST /api/v1/trees/:treeId/health-logs
   * Submits a new health observation log for a Verified tree.
   * Access: Protected (Caretaker)
   */
  async createHealthLog(req, res, next) {
    try {
      const { treeId } = req.params;
      const submittedBy = req.user.id;
      const { healthStatus, notes, photoReference, photo } = req.body;

      // Determine photo reference from uploaded file (storageService) or body payload
      let finalPhotoReference = null;
      if (req.file) {
        finalPhotoReference = await storageService.uploadFile({
          file: req.file,
          prefix: 'health',
        });
      } else if (photoReference && typeof photoReference === 'string') {
        finalPhotoReference = photoReference.trim();
      } else if (photo && typeof photo === 'string') {
        finalPhotoReference = photo.trim();
      }

      const result = await treeHealthService.createHealthLog({
        treeIdentifier: treeId,
        submittedBy,
        healthStatus,
        photoReference: finalPhotoReference,
        notes,
      });

      return sendSuccess(res, result, 201);
    } catch (err) {
      return next(err);
    }
  }

  /**
   * Handles GET /api/v1/trees/:treeId/health-logs
   * Retrieves chronological paginated health history for a Verified tree.
   * Access: Public (Verified profile)
   */
  async getHealthHistory(req, res, next) {
    try {
      const { treeId } = req.params;
      const { page, pageSize } = req.query;

      const result = await treeHealthService.getHealthHistory({
        treeIdentifier: treeId,
        page,
        pageSize,
      });

      return sendSuccess(res, result, 200);
    } catch (err) {
      return next(err);
    }
  }

  /**
   * Handles GET /api/v1/trees/:treeId/health-logs/:logId/photo
   * Generates an authorized, short-lived signed URL to view health observation photo evidence.
   * Access: Protected (Caretaker, Admin, or Tree Owner Contributor).
   */
  async getHealthLogPhoto(req, res, next) {
    try {
      const { logId } = req.params;
      if (!logId) {
        throw new BadRequestError('Log ID is required', 'MISSING_LOG_ID');
      }

      const log = await treeHealthRepository.findHealthLogById(logId);
      if (!log) {
        throw new NotFoundError(`Health log '${logId}' not found`, 'LOG_NOT_FOUND');
      }

      const isCaretaker = req.user && req.user.role === 'caretaker';
      const isAdmin = req.user && req.user.role === 'admin';
      const isOwner = req.user && req.user.id === log.contributor_id;

      if (!isCaretaker && !isAdmin && !isOwner) {
        throw new ForbiddenError(
          'You are not authorized to view this health observation photo',
          'UNAUTHORIZED_PHOTO_ACCESS'
        );
      }

      if (!log.photo_reference) {
        throw new NotFoundError(
          `No photo evidence on record for health log '${logId}'`,
          'PHOTO_NOT_FOUND'
        );
      }

      const signedUrl = await storageService.getSignedUrl(log.photo_reference);

      return sendSuccess(res, {
        logId: log.id,
        treeId: log.public_tree_id || log.tree_id,
        photoReference: log.photo_reference,
        photoUrl: signedUrl,
      }, 200);
    } catch (err) {
      return next(err);
    }
  }
}

module.exports = new TreeHealthController();
