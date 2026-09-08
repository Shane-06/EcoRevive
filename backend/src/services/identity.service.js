const identityRepository = require('../repositories/identity.repository');
const treeHealthRepository = require('../repositories/treeHealth.repository');
const { withTransaction } = require('../config/db');
const { generateTreeQrPayload } = require('../utils/qr');
const {
  BadRequestError,
  NotFoundError,
  ConflictError,
} = require('../utils/errors');

class IdentityService {
  /**
   * Issues an authoritative, unique Tree ID to an already Verified tree (Idempotent).
   * @param {object} params
   * @param {string} params.treeId - Tree UUID or existing Tree ID
   * @param {string} params.reviewerId - Authenticated admin user UUID
   * @returns {Promise<object>} Identity issuance payload
   */
  async issueTreeIdentity({ treeId, reviewerId }) {
    if (!treeId || typeof treeId !== 'string' || treeId.trim() === '') {
      throw new BadRequestError('Tree ID is required', 'MISSING_TREE_ID');
    }
    if (!reviewerId) {
      throw new BadRequestError('Reviewer ID is required', 'MISSING_REVIEWER_ID');
    }

    return withTransaction(async (client) => {
      const tree = await identityRepository.findTreeForUpdate(client, treeId.trim());
      if (!tree) {
        throw new NotFoundError(`Tree '${treeId}' not found`, 'TREE_NOT_FOUND');
      }

      if (tree.status !== 'Verified') {
        throw new ConflictError(
          `Cannot issue Tree ID: tree is currently in '${tree.status}' status. Tree must be Verified.`,
          'UNVERIFIED_TREE'
        );
      }

      // Idempotent: If Tree ID already assigned, return existing identity without re-generating
      if (tree.tree_id) {
        return {
          treeId: tree.tree_id,
          status: 'Verified',
          tree: {
            id: tree.id,
            treeId: tree.tree_id,
            species: tree.species,
            status: tree.status,
          },
          identity: {
            treeId: tree.tree_id,
          },
        };
      }

      // Generate next sequential unique Tree ID (ER-PLT-XXXXX)
      const newTreeId = await identityRepository.getNextTreeId(client);
      const updatedTree = await identityRepository.assignTreeId(client, tree.id, newTreeId);

      return {
        treeId: updatedTree.tree_id,
        status: 'Verified',
        tree: {
          id: updatedTree.id,
          treeId: updatedTree.tree_id,
          species: updatedTree.species,
          status: updatedTree.status,
        },
        identity: {
          treeId: updatedTree.tree_id,
        },
      };
    });
  }

  /**
   * Retrieves the privacy-safe public tree profile for a Verified tree.
   * @param {string} treeIdentifier - Public Tree ID or UUID
   * @returns {Promise<{tree: object}>} Public profile payload
   */
  async getPublicTreeProfile(treeIdentifier) {
    if (!treeIdentifier || typeof treeIdentifier !== 'string' || treeIdentifier.trim() === '') {
      throw new BadRequestError('Tree ID is required', 'MISSING_TREE_ID');
    }

    const row = await identityRepository.findPublicTreeProfile(treeIdentifier.trim());
    if (!row) {
      throw new NotFoundError(
        `Public verified tree profile for '${treeIdentifier}' not found`,
        'TREE_NOT_FOUND'
      );
    }

    let plantedOnStr = row.planted_on;
    if (row.planted_on instanceof Date) {
      const year = row.planted_on.getFullYear();
      const month = String(row.planted_on.getMonth() + 1).padStart(2, '0');
      const day = String(row.planted_on.getDate()).padStart(2, '0');
      plantedOnStr = `${year}-${month}-${day}`;
    } else if (typeof row.planted_on === 'string') {
      plantedOnStr = row.planted_on.split('T')[0];
    }

    const [latestHealth, healthHistoryRows] = await Promise.all([
      treeHealthRepository.findLatestHealthLog(row.id),
      treeHealthRepository.findPublicHealthHistory(row.id, 20),
    ]);

    const currentHealth = latestHealth ? latestHealth.health_status : null;
    const healthHistory = healthHistoryRows.map((h) => ({
      id: h.id,
      healthStatus: h.health_status,
      recordedAt: h.recorded_at,
      notes: h.notes || null,
      photoReference: h.photo_reference || null,
    }));

    return {
      tree: {
        treeId: row.tree_id || null,
        species: row.species,
        plantedOn: plantedOnStr,
        status: 'Verified',
        latitude: parseFloat(row.latitude),
        longitude: parseFloat(row.longitude),
        contributor: {
          displayName: row.contributor_display_name || 'Anonymous',
        },
        currentHealth,
        healthHistory,
      },
    };
  }

  /**
   * Retrieves the canonical QR payload for a Verified tree.
   * @param {string} treeIdentifier - Public Tree ID or UUID
   * @returns {Promise<object>} QR payload
   */
  async getPublicTreeQr(treeIdentifier) {
    if (!treeIdentifier || typeof treeIdentifier !== 'string' || treeIdentifier.trim() === '') {
      throw new BadRequestError('Tree ID is required', 'MISSING_TREE_ID');
    }

    const row = await identityRepository.findPublicTreeProfile(treeIdentifier.trim());
    if (!row || !row.tree_id) {
      throw new NotFoundError(
        `Public QR identity for '${treeIdentifier}' not found`,
        'TREE_NOT_FOUND'
      );
    }

    return generateTreeQrPayload(row.tree_id);
  }
}

module.exports = new IdentityService();
