/**
 * EcoRevive V2-M4 — Health Intelligence Service
 *
 * Orchestrates deterministic health-trend analysis, monitoring freshness,
 * and explainable follow-up suggestions with strict authorization and data minimization.
 */

const healthIntelligenceRepository = require('../../repositories/healthIntelligence.repository');
const { calculateHealthTrend } = require('./healthTrend.service');
const { calculateMonitoringStatus } = require('./monitoringStatus.service');
const { generateFollowUpSuggestions } = require('./followUp.service');
const config = require('../../config');
const {
  BadRequestError,
  NotFoundError,
  UnauthorizedError,
} = require('../../utils/errors');

class HealthIntelligenceService {
  constructor(options = {}) {
    this.repository = options.repository || healthIntelligenceRepository;
    this.defaultIntervalDays =
      options.defaultIntervalDays ||
      config.healthIntelligence?.monitoringIntervalDays ||
      30;
  }

  /**
   * Retrieves paginated health intelligence insights scoped to the calling user.
   *
   * @param {object} params
   * @param {object} params.user - Authenticated user context ({ id, role })
   * @param {number|string} [params.page=1]
   * @param {number|string} [params.pageSize=20]
   * @param {Date|string|number} [params.now] - Optional injectable clock for tests
   * @param {number} [params.intervalDays] - Optional override of monitoring interval
   * @returns {Promise<object>} Paginated insights payload
   */
  async listInsights({ user, page = 1, pageSize = 20, now, intervalDays }) {
    if (!user || !user.id || !user.role) {
      throw new UnauthorizedError('Authentication required to access health intelligence');
    }

    const parsedPage = Math.max(1, parseInt(page, 10) || 1);
    const parsedPageSize = Math.min(100, Math.max(1, parseInt(pageSize, 10) || 20));
    const offset = (parsedPage - 1) * parsedPageSize;
    const effectiveIntervalDays = intervalDays || this.defaultIntervalDays;

    const [trees, total] = await Promise.all([
      this.repository.findScopedVerifiedTrees({
        user,
        limit: parsedPageSize,
        offset,
      }),
      this.repository.countScopedVerifiedTrees(user),
    ]);

    if (!trees || trees.length === 0) {
      return {
        insights: [],
        pagination: {
          total: 0,
          page: parsedPage,
          pageSize: parsedPageSize,
          totalPages: 1,
        },
      };
    }

    // Single partitioned query to fetch latest observations for all page trees
    const treeUuids = trees.map((t) => t.id);
    const allObservations = await this.repository.findLatestObservationsForTrees(treeUuids);

    // Group observations by tree_id
    const obsByTreeId = new Map();
    for (const obs of allObservations) {
      if (!obsByTreeId.has(obs.tree_id)) {
        obsByTreeId.set(obs.tree_id, []);
      }
      obsByTreeId.get(obs.tree_id).push(obs);
    }

    const insights = trees.map((tree) => {
      const treeObservations = obsByTreeId.get(tree.id) || [];
      const trendResult = calculateHealthTrend(treeObservations);

      // Latest observation is the first item in newest-first order
      const latestObs = treeObservations[0] || null;
      const latestStatus = latestObs
        ? (latestObs.health_status || latestObs.healthStatus || '').trim() || null
        : null;
      const latestObservationAt = latestObs
        ? new Date(latestObs.recorded_at || latestObs.recordedAt).toISOString()
        : null;

      const monitoring = calculateMonitoringStatus(latestObservationAt, {
        now,
        intervalDays: effectiveIntervalDays,
      });

      const followUp = generateFollowUpSuggestions({
        latestStatus,
        trend: trendResult.trend,
        monitoring,
      });

      // Strict contract and data minimization
      return {
        treeId: tree.tree_id || tree.id,
        species: tree.species,
        plantedOn: tree.planted_on ? tree.planted_on.split('T')[0] : null,
        latestStatus,
        latestObservationAt,
        trend: trendResult.trend,
        monitoring: {
          status: monitoring.status,
          intervalDays: monitoring.intervalDays,
          daysSinceLastObservation: monitoring.daysSinceLastObservation,
        },
        evidenceCount: trendResult.evidenceCount,
        recommendation: followUp.recommendation,
      };
    });

    const totalPages = Math.ceil(total / parsedPageSize) || 1;

    return {
      insights,
      pagination: {
        total,
        page: parsedPage,
        pageSize: parsedPageSize,
        totalPages,
      },
    };
  }

  /**
   * Retrieves deterministic health intelligence insight for a single verified tree.
   *
   * @param {object} params
   * @param {string} params.treeIdentifier - Public Tree ID (ER-PLT-XXXXX) or UUID
   * @param {object} params.user - Authenticated user context ({ id, role })
   * @param {Date|string|number} [params.now] - Optional injectable clock for tests
   * @param {number} [params.intervalDays] - Optional override of monitoring interval
   * @returns {Promise<object>} Single tree insight payload
   */
  async getTreeInsight({ treeIdentifier, user, now, intervalDays }) {
    if (!user || !user.id || !user.role) {
      throw new UnauthorizedError('Authentication required to access health intelligence');
    }

    if (!treeIdentifier || typeof treeIdentifier !== 'string' || treeIdentifier.trim() === '') {
      throw new BadRequestError('Tree ID is required', 'MISSING_TREE_ID');
    }

    const trimmedIdentifier = treeIdentifier.trim();
    const tree = await this.repository.findVerifiedTreeByIdentifier(trimmedIdentifier);

    // Non-disclosure: Return 404 for unverified or non-existent trees
    if (!tree || tree.status !== 'Verified') {
      throw new NotFoundError(`Tree '${trimmedIdentifier}' not found`, 'TREE_NOT_FOUND');
    }

    // Role-based authorization: Contributor can only access their own verified trees
    if (user.role === 'contributor' && tree.contributor_id !== user.id) {
      throw new NotFoundError(`Tree '${trimmedIdentifier}' not found`, 'TREE_NOT_FOUND');
    }

    const observations = await this.repository.findLatestObservationsForTree(tree.id);
    const trendResult = calculateHealthTrend(observations);

    const latestObs = observations[0] || null;
    const latestStatus = latestObs
      ? (latestObs.health_status || latestObs.healthStatus || '').trim() || null
      : null;
    const latestObservationAt = latestObs
      ? new Date(latestObs.recorded_at || latestObs.recordedAt).toISOString()
      : null;

    const effectiveIntervalDays = intervalDays || this.defaultIntervalDays;
    const monitoring = calculateMonitoringStatus(latestObservationAt, {
      now,
      intervalDays: effectiveIntervalDays,
    });

    const followUp = generateFollowUpSuggestions({
      latestStatus,
      trend: trendResult.trend,
      monitoring,
    });

    return {
      treeId: tree.tree_id || tree.id,
      species: tree.species,
      plantedOn: tree.planted_on ? tree.planted_on.split('T')[0] : null,
      latestStatus,
      latestObservationAt,
      trend: trendResult.trend,
      monitoring: {
        status: monitoring.status,
        intervalDays: monitoring.intervalDays,
        daysSinceLastObservation: monitoring.daysSinceLastObservation,
      },
      evidence: trendResult.evidence,
      explanation: trendResult.explanation,
      recommendation: followUp.recommendation,
    };
  }
}

module.exports = new HealthIntelligenceService();
