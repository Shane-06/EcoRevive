const treeHealthRepository = require('../repositories/treeHealth.repository');
const {
  BadRequestError,
  NotFoundError,
  ConflictError,
} = require('../utils/errors');

const FROZEN_HEALTH_STATUSES = ['Healthy', 'Good', 'Needs Attention', 'Dead'];

class TreeHealthService {
  /**
   * Helper to format a health log record for API responses.
   * @param {object} row - Database row
   * @returns {object} Formatted health log item
   */
  formatHealthLogItem(row) {
    return {
      id: row.id,
      treeId: row.public_tree_id || row.tree_id,
      healthStatus: row.health_status,
      photoReference: row.photo_reference || null,
      notes: row.notes || null,
      recordedAt: row.recorded_at,
      submittedBy: row.submitted_by_id
        ? {
            id: row.submitted_by_id,
            name: row.submitted_by_name,
          }
        : null,
    };
  }

  /**
   * Creates a new health observation log for a Verified tree.
   * @param {object} params
   * @param {string} params.treeIdentifier - Tree UUID or public Tree ID (ER-PLT-XXXXX)
   * @param {string} params.submittedBy - Authenticated caretaker user UUID
   * @param {string} params.healthStatus - Frozen health status
   * @param {string|null} [params.photoReference] - Photo path or reference
   * @param {string|null} [params.notes] - Caretaker notes
   * @returns {Promise<object>} Created health log payload
   */
  async createHealthLog({
    treeIdentifier,
    submittedBy,
    healthStatus,
    photoReference = null,
    notes = null,
  }) {
    if (!treeIdentifier || typeof treeIdentifier !== 'string' || treeIdentifier.trim() === '') {
      throw new BadRequestError('Tree ID is required', 'MISSING_TREE_ID');
    }
    if (!submittedBy) {
      throw new BadRequestError('Caretaker ID is required', 'MISSING_SUBMITTED_BY');
    }

    if (!healthStatus || typeof healthStatus !== 'string' || healthStatus.trim() === '') {
      throw new BadRequestError(
        'Health status is required',
        'VALIDATION_ERROR',
        { field: 'healthStatus' }
      );
    }

    const trimmedStatus = healthStatus.trim();
    if (!FROZEN_HEALTH_STATUSES.includes(trimmedStatus)) {
      throw new BadRequestError(
        `Invalid health status. Allowed values: [${FROZEN_HEALTH_STATUSES.join(', ')}]`,
        'INVALID_HEALTH_STATUS',
        { field: 'healthStatus', allowedValues: FROZEN_HEALTH_STATUSES }
      );
    }

    let sanitizedNotes = null;
    if (notes !== null && notes !== undefined) {
      if (typeof notes !== 'string') {
        throw new BadRequestError('Notes must be a string', 'VALIDATION_ERROR', { field: 'notes' });
      }
      sanitizedNotes = notes.trim();
      if (sanitizedNotes.length > 1000) {
        throw new BadRequestError(
          'Notes must not exceed 1000 characters',
          'VALIDATION_ERROR',
          { field: 'notes' }
        );
      }
      if (sanitizedNotes.length === 0) {
        sanitizedNotes = null;
      }
    }

    const tree = await treeHealthRepository.findTreeByIdentifier(treeIdentifier.trim());
    if (!tree) {
      throw new NotFoundError(`Tree '${treeIdentifier}' not found`, 'TREE_NOT_FOUND');
    }

    // Tree Eligibility: Must be 'Verified' and have an authoritative Tree ID
    if (tree.status !== 'Verified' || !tree.tree_id) {
      throw new ConflictError(
        `Cannot submit health log: tree is currently in '${tree.status}' status. Tree must be Verified with a valid Tree ID.`,
        'UNVERIFIED_TREE'
      );
    }

    const createdRow = await treeHealthRepository.createHealthLog({
      treeId: tree.id,
      submittedBy,
      healthStatus: trimmedStatus,
      photoReference: photoReference || null,
      notes: sanitizedNotes,
    });

    return {
      healthLog: this.formatHealthLogItem(createdRow),
    };
  }

  /**
   * Retrieves paginated chronological health history for a tree in newest-first order.
   * @param {object} params
   * @param {string} params.treeIdentifier - Tree UUID or public Tree ID
   * @param {number|string} [params.page=1]
   * @param {number|string} [params.pageSize=20]
   * @returns {Promise<object>} Health history payload with pagination
   */
  async getHealthHistory({ treeIdentifier, page = 1, pageSize = 20 } = {}) {
    if (!treeIdentifier || typeof treeIdentifier !== 'string' || treeIdentifier.trim() === '') {
      throw new BadRequestError('Tree ID is required', 'MISSING_TREE_ID');
    }

    const tree = await treeHealthRepository.findTreeByIdentifier(treeIdentifier.trim());
    if (!tree) {
      throw new NotFoundError(`Tree '${treeIdentifier}' not found`, 'TREE_NOT_FOUND');
    }

    if (tree.status !== 'Verified') {
      throw new NotFoundError(
        `Health history for unverified tree '${treeIdentifier}' not found`,
        'TREE_NOT_FOUND'
      );
    }

    const parsedPage = Math.max(1, parseInt(page, 10) || 1);
    const parsedPageSize = Math.min(100, Math.max(1, parseInt(pageSize, 10) || 20));
    const offset = (parsedPage - 1) * parsedPageSize;

    const [rows, total] = await Promise.all([
      treeHealthRepository.findHealthLogsByTreeId({
        treeId: tree.id,
        limit: parsedPageSize,
        offset,
      }),
      treeHealthRepository.countHealthLogsByTreeId(tree.id),
    ]);

    return {
      treeId: tree.tree_id || tree.id,
      healthLogs: rows.map((r) => this.formatHealthLogItem(r)),
      pagination: {
        total,
        page: parsedPage,
        pageSize: parsedPageSize,
        totalPages: Math.ceil(total / parsedPageSize) || 1,
      },
    };
  }
}

module.exports = new TreeHealthService();
