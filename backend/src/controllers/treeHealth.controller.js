const treeHealthService = require('../services/treeHealth.service');
const { sendSuccess } = require('../utils/apiResponse');

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

      // Determine photo reference from uploaded file (multer) or body payload
      let finalPhotoReference = null;
      if (req.file) {
        finalPhotoReference = req.file.path.replace(/\\/g, '/');
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
}

module.exports = new TreeHealthController();
