const verificationService = require('../services/verification.service');
const { sendSuccess } = require('../utils/apiResponse');

/**
 * Controller for Admin Verification Endpoints.
 */
class VerificationController {
  /**
   * Handles GET /api/v1/admin/verifications
   * Retrieves review queue for administrators.
   */
  async getReviewQueue(req, res, next) {
    try {
      const { status, page, pageSize } = req.query;
      const result = await verificationService.getReviewQueue({ status, page, pageSize });
      return sendSuccess(res, result, 200);
    } catch (err) {
      return next(err);
    }
  }

  /**
   * Handles PATCH /api/v1/admin/verifications/:treeId/start
   * Starts review on a plantation record (Pending -> Under Review).
   */
  async startReview(req, res, next) {
    try {
      const { treeId } = req.params;
      const reviewerId = req.user.id;
      const result = await verificationService.startReview({ treeId, reviewerId });
      return sendSuccess(res, result, 200);
    } catch (err) {
      return next(err);
    }
  }

  /**
   * Handles PATCH /api/v1/admin/verifications/:treeId/approve
   * Approves a plantation record (Under Review -> Verified).
   */
  async approveVerification(req, res, next) {
    try {
      const { treeId } = req.params;
      const reviewerId = req.user.id;
      const result = await verificationService.approveVerification({ treeId, reviewerId });
      return sendSuccess(res, result, 200);
    } catch (err) {
      return next(err);
    }
  }

  /**
   * Handles PATCH /api/v1/admin/verifications/:treeId/reject
   * Rejects a plantation record (Under Review -> Rejected).
   */
  async rejectVerification(req, res, next) {
    try {
      const { treeId } = req.params;
      const { reason } = req.body || {};
      const reviewerId = req.user.id;
      const result = await verificationService.rejectVerification({
        treeId,
        reviewerId,
        reason,
      });
      return sendSuccess(res, result, 200);
    } catch (err) {
      return next(err);
    }
  }
}

module.exports = new VerificationController();
