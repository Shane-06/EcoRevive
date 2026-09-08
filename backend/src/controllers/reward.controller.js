const rewardService = require('../services/reward.service');

class RewardController {
  /**
   * GET /api/v1/rewards/me
   * Retrieves the authenticated user's total points and paginated activity history.
   */
  async getMyRewards(req, res, next) {
    try {
      const data = await rewardService.getUserRewards({
        userId: req.user.id,
        page: req.query.page,
        pageSize: req.query.pageSize,
      });

      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      return next(error);
    }
  }
}

module.exports = new RewardController();
