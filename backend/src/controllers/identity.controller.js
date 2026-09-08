const identityService = require('../services/identity.service');
const { sendSuccess } = require('../utils/apiResponse');

class IdentityController {
  /**
   * Retrieves the privacy-safe public tree profile for a Verified tree.
   * @route GET /api/v1/public/trees/:treeId
   */
  async getPublicProfile(req, res, next) {
    try {
      const { treeId } = req.params;
      const data = await identityService.getPublicTreeProfile(treeId);
      return sendSuccess(res, data, 200);
    } catch (err) {
      return next(err);
    }
  }

  /**
   * Retrieves the canonical public QR code payload for a Verified tree.
   * @route GET /api/v1/public/trees/:treeId/qr
   */
  async getPublicQr(req, res, next) {
    try {
      const { treeId } = req.params;
      const data = await identityService.getPublicTreeQr(treeId);
      return sendSuccess(res, data, 200);
    } catch (err) {
      return next(err);
    }
  }

  /**
   * Issues or retrieves authoritative permanent Tree ID for a Verified tree.
   * @route POST /api/v1/admin/trees/:treeId/identity
   */
  async issueIdentity(req, res, next) {
    try {
      const { treeId } = req.params;
      const reviewerId = req.user?.id;
      const data = await identityService.issueTreeIdentity({
        treeId,
        reviewerId,
      });
      return sendSuccess(res, data, 200);
    } catch (err) {
      return next(err);
    }
  }
}

module.exports = new IdentityController();
