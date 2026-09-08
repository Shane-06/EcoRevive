const verificationRepository = require('../repositories/verification.repository');
const identityRepository = require('../repositories/identity.repository');
const { withTransaction } = require('../config/db');
const {
  BadRequestError,
  NotFoundError,
  ConflictError,
} = require('../utils/errors');

const VALID_STATUSES = ['Pending', 'Under Review', 'Verified', 'Rejected'];

class VerificationService {
  /**
   * Helper to format a review queue tree row according to API Specification V1.0.
   * @param {object} row - Database row
   * @returns {object} Formatted tree item
   */
  formatQueueItem(row) {
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
      photoReference: row.photo_reference || null,
      status: row.status,
      plantedOn: plantedOnStr,
      contributor: row.contributor_id
        ? {
            id: row.contributor_id,
            name: row.contributor_name,
            email: row.contributor_email,
          }
        : null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /**
   * Retrieves the admin review queue with optional status filtering and pagination.
   * @param {object} params
   * @param {string} [params.status] - Status filter ('Pending', 'Under Review', etc.)
   * @param {number|string} [params.page=1] - Page number
   * @param {number|string} [params.pageSize=20] - Page size
   * @returns {Promise<{trees: Array<object>, pagination: object}>}
   */
  async getReviewQueue({ status = null, page = 1, pageSize = 20 } = {}) {
    let validatedStatus = null;
    if (status !== null && status !== undefined && status !== '') {
      if (!VALID_STATUSES.includes(status)) {
        throw new BadRequestError(
          `Invalid status filter. Allowed values: [${VALID_STATUSES.join(', ')}]`,
          'INVALID_STATUS_FILTER'
        );
      }
      validatedStatus = status;
    }

    const parsedPage = Math.max(1, parseInt(page, 10) || 1);
    const parsedPageSize = Math.min(100, Math.max(1, parseInt(pageSize, 10) || 20));
    const offset = (parsedPage - 1) * parsedPageSize;

    const [rows, total] = await Promise.all([
      verificationRepository.findReviewQueue({
        status: validatedStatus,
        limit: parsedPageSize,
        offset,
      }),
      verificationRepository.countReviewQueue({ status: validatedStatus }),
    ]);

    return {
      trees: rows.map((r) => this.formatQueueItem(r)),
      pagination: {
        total,
        page: parsedPage,
        pageSize: parsedPageSize,
        totalPages: Math.ceil(total / parsedPageSize) || 1,
      },
    };
  }

  /**
   * Starts review on a plantation record: Pending -> Under Review.
   * @param {object} params
   * @param {string} params.treeId - Tree UUID or public Tree ID
   * @param {string} params.reviewerId - Authenticated admin user UUID
   * @returns {Promise<object>} Result payload with updated status
   */
  async startReview({ treeId, reviewerId }) {
    if (!treeId || typeof treeId !== 'string' || treeId.trim() === '') {
      throw new BadRequestError('Tree ID is required', 'MISSING_TREE_ID');
    }
    if (!reviewerId) {
      throw new BadRequestError('Reviewer ID is required', 'MISSING_REVIEWER_ID');
    }

    return withTransaction(async (client) => {
      const tree = await verificationRepository.findTreeForUpdate(client, treeId.trim());
      if (!tree) {
        throw new NotFoundError(`Tree '${treeId}' not found`, 'TREE_NOT_FOUND');
      }

      if (tree.status !== 'Pending') {
        throw new ConflictError(
          `Cannot start review: tree is currently in '${tree.status}' status. Expected 'Pending'.`,
          'INVALID_STATE_TRANSITION'
        );
      }

      const updatedTree = await verificationRepository.updateTreeStatus(
        client,
        tree.id,
        'Under Review'
      );

      await verificationRepository.createVerificationAudit(client, {
        treeId: tree.id,
        reviewerId,
        decision: 'UNDER_REVIEW',
        reason: null,
      });

      return {
        treeId: updatedTree.tree_id || updatedTree.id,
        status: 'Under Review',
        tree: {
          id: updatedTree.id,
          treeId: updatedTree.tree_id || null,
          species: updatedTree.species,
          status: updatedTree.status,
        },
      };
    });
  }

  /**
   * Approves a plantation record: Under Review -> Verified.
   * @param {object} params
   * @param {string} params.treeId - Tree UUID or public Tree ID
   * @param {string} params.reviewerId - Authenticated admin user UUID
   * @returns {Promise<object>} Result payload with updated status
   */
  async approveVerification({ treeId, reviewerId }) {
    if (!treeId || typeof treeId !== 'string' || treeId.trim() === '') {
      throw new BadRequestError('Tree ID is required', 'MISSING_TREE_ID');
    }
    if (!reviewerId) {
      throw new BadRequestError('Reviewer ID is required', 'MISSING_REVIEWER_ID');
    }

    return withTransaction(async (client) => {
      const tree = await verificationRepository.findTreeForUpdate(client, treeId.trim());
      if (!tree) {
        throw new NotFoundError(`Tree '${treeId}' not found`, 'TREE_NOT_FOUND');
      }

      if (tree.status !== 'Under Review') {
        throw new ConflictError(
          `Cannot approve tree: tree is currently in '${tree.status}' status. Expected 'Under Review'.`,
          'INVALID_STATE_TRANSITION'
        );
      }

      // Generate next sequential unique Tree ID if not already assigned
      const newTreeId = tree.tree_id || (await identityRepository.getNextTreeId(client));

      const updatedTree = await verificationRepository.updateTreeStatus(
        client,
        tree.id,
        'Verified',
        newTreeId
      );

      await verificationRepository.createVerificationAudit(client, {
        treeId: tree.id,
        reviewerId,
        decision: 'VERIFIED',
        reason: null,
      });

      return {
        tree: {
          id: updatedTree.id,
          treeId: updatedTree.tree_id,
          species: updatedTree.species,
          status: 'Verified',
        },
        identity: {
          treeId: updatedTree.tree_id,
        },
      };
    });
  }

  /**
   * Rejects a plantation record: Under Review -> Rejected.
   * @param {object} params
   * @param {string} params.treeId - Tree UUID or public Tree ID
   * @param {string} params.reviewerId - Authenticated admin user UUID
   * @param {string} params.reason - Rejection reason (mandatory)
   * @returns {Promise<object>} Result payload with updated status and reason
   */
  async rejectVerification({ treeId, reviewerId, reason }) {
    if (!treeId || typeof treeId !== 'string' || treeId.trim() === '') {
      throw new BadRequestError('Tree ID is required', 'MISSING_TREE_ID');
    }
    if (!reviewerId) {
      throw new BadRequestError('Reviewer ID is required', 'MISSING_REVIEWER_ID');
    }
    if (!reason || typeof reason !== 'string' || reason.trim() === '') {
      throw new BadRequestError(
        'Rejection reason is required',
        'VALIDATION_ERROR',
        { field: 'reason' }
      );
    }

    return withTransaction(async (client) => {
      const tree = await verificationRepository.findTreeForUpdate(client, treeId.trim());
      if (!tree) {
        throw new NotFoundError(`Tree '${treeId}' not found`, 'TREE_NOT_FOUND');
      }

      if (tree.status !== 'Under Review') {
        throw new ConflictError(
          `Cannot reject tree: tree is currently in '${tree.status}' status. Expected 'Under Review'.`,
          'INVALID_STATE_TRANSITION'
        );
      }

      const updatedTree = await verificationRepository.updateTreeStatus(
        client,
        tree.id,
        'Rejected'
      );

      await verificationRepository.createVerificationAudit(client, {
        treeId: tree.id,
        reviewerId,
        decision: 'REJECTED',
        reason: reason.trim(),
      });

      return {
        treeId: updatedTree.tree_id || updatedTree.id,
        status: 'Rejected',
        reason: reason.trim(),
        tree: {
          id: updatedTree.id,
          treeId: updatedTree.tree_id || null,
          species: updatedTree.species,
          status: 'Rejected',
        },
      };
    });
  }

  /**
   * Retrieves audit verification history for a given tree.
   * @param {string} treeId - Tree UUID
   * @returns {Promise<Array<object>>} Verification history
   */
  async getVerificationHistory(treeId) {
    if (!treeId || typeof treeId !== 'string' || treeId.trim() === '') {
      throw new BadRequestError('Tree ID is required', 'MISSING_TREE_ID');
    }
    return verificationRepository.findHistoryByTreeId(treeId.trim());
  }
}

module.exports = new VerificationService();
