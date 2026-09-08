const rewardRepository = require('../repositories/reward.repository');
const { BadRequestError } = require('../utils/errors');

class RewardService {
  /**
   * Validates and retrieves paginated reward history and total points for a user.
   * @param {object} params
   * @param {string} params.userId - User UUID
   * @param {number|string} [params.page=1] - Page number (>= 1)
   * @param {number|string} [params.pageSize=20] - Page size (1..100)
   * @returns {Promise<{totalPoints: number, activities: Array<object>, pagination: object}>}
   */
  async getUserRewards({ userId, page = 1, pageSize = 20 }) {
    if (!userId) {
      throw new BadRequestError('User ID is required', 'MISSING_USER_ID');
    }

    // Deterministic validation for page parameter
    if (page !== undefined && page !== null) {
      const numPage = Number(page);
      if (!Number.isInteger(numPage) || numPage < 1) {
        throw new BadRequestError(
          'Invalid pagination parameter: page must be a positive integer >= 1',
          'INVALID_PAGINATION',
          { field: 'page', value: page }
        );
      }
    }

    // Deterministic validation for pageSize parameter
    if (pageSize !== undefined && pageSize !== null) {
      const numPageSize = Number(pageSize);
      if (!Number.isInteger(numPageSize) || numPageSize < 1 || numPageSize > 100) {
        throw new BadRequestError(
          'Invalid pagination parameter: pageSize must be an integer between 1 and 100',
          'INVALID_PAGINATION',
          { field: 'pageSize', value: pageSize }
        );
      }
    }

    const parsedPage = parseInt(page, 10) || 1;
    const parsedPageSize = parseInt(pageSize, 10) || 20;
    const offset = (parsedPage - 1) * parsedPageSize;

    const [totalPoints, rows, total] = await Promise.all([
      rewardRepository.getTotalPointsByUserId(userId),
      rewardRepository.findRewardsByUserId({
        userId,
        limit: parsedPageSize,
        offset,
      }),
      rewardRepository.countRewardsByUserId(userId),
    ]);

    return {
      totalPoints,
      activities: rows.map((r) => ({
        id: r.id,
        activity: r.activity,
        points: r.points,
        createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
      })),
      pagination: {
        total,
        page: parsedPage,
        pageSize: parsedPageSize,
        totalPages: Math.ceil(total / parsedPageSize) || 1,
      },
    };
  }
}

module.exports = new RewardService();
