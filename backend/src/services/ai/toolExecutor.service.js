const { TOOL_DEFINITIONS } = require('./toolRegistry');
const treeRepository = require('../../repositories/tree.repository');
const treeHealthRepository = require('../../repositories/treeHealth.repository');
const identityRepository = require('../../repositories/identity.repository');
const dashboardRepository = require('../../repositories/dashboard.repository');
const { query } = require('../../config/db');

// Bounds enforced by freeze record
const TOOL_TIMEOUT_MS = 3000;
const MAX_OUTPUT_CHARS = 2000;

class ToolExecutorService {
  constructor(options = {}) {
    this.treeRepository = options.treeRepository || treeRepository;
    this.treeHealthRepository = options.treeHealthRepository || treeHealthRepository;
    this.identityRepository = options.identityRepository || identityRepository;
    this.dashboardRepository = options.dashboardRepository || dashboardRepository;
    this.query = options.query || query;
  }

  /**
   * Executes an allowlisted read-only tool within the authenticated user context.
   *
   * @param {string} toolName - Name of the tool to execute
   * @param {object} rawArgs - Model-provided raw arguments (untrusted)
   * @param {object} userContext - Authenticated user context from JWT ({ id, role })
   * @returns {Promise<{ success: boolean, data?: object, error?: string, sourceAttribution?: object }>}
   */
  async executeTool(toolName, rawArgs = {}, userContext = {}) {
    // 1. Verify user context
    if (!userContext || !userContext.id || !userContext.role) {
      return {
        success: false,
        error: 'AUTHENTICATION_REQUIRED',
        message: 'A valid authenticated user context is required to execute platform tools.',
      };
    }

    // 2. Validate tool exists on allowlist
    if (!Object.prototype.hasOwnProperty.call(TOOL_DEFINITIONS, toolName)) {
      return {
        success: false,
        error: 'UNKNOWN_TOOL',
        message: `Tool "${toolName}" is not an allowlisted read-only tool.`,
      };
    }
    const tool = TOOL_DEFINITIONS[toolName];

    // 3. Verify server-side role authorization
    if (!Array.isArray(tool.allowedRoles) || !tool.allowedRoles.includes(userContext.role)) {
      return {
        success: false,
        error: 'UNAUTHORIZED_TOOL',
        message: `Role "${userContext.role}" is not authorized to execute tool "${toolName}".`,
      };
    }

    // 4. Validate arguments against schema & regex
    let validatedArgs;
    try {
      validatedArgs = tool.validateArgs(rawArgs);
    } catch (valErr) {
      return {
        success: false,
        error: 'INVALID_ARGUMENTS',
        message: valErr.message,
      };
    }

    // 5. Execute with bounded timeout
    let timer;
    const executionPromise = this._dispatch(toolName, validatedArgs, userContext);
    const timeoutPromise = new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(`Tool execution timed out after ${TOOL_TIMEOUT_MS}ms`)), TOOL_TIMEOUT_MS);
    });

    try {
      const result = await Promise.race([executionPromise, timeoutPromise]);
      clearTimeout(timer);

      // 6. Enforce output bounding and data minimization
      const jsonStr = JSON.stringify(result.data || {});
      if (jsonStr.length > MAX_OUTPUT_CHARS) {
        return {
          success: false,
          error: 'OUTPUT_TOO_LARGE',
          message: 'Tool output exceeded maximum size limit.',
        };
      }

      return result;
    } catch (err) {
      clearTimeout(timer);
      // Security Invariant: Mask internal errors, never leak SQL or stack traces
      console.error(`[Tool Executor Alert] Error executing ${toolName}:`, err.message);
      return {
        success: false,
        error: 'EXECUTION_FAILED',
        message: 'An error occurred while retrieving platform data.',
      };
    }
  }

  /**
   * Internal dispatcher for allowlisted tools.
   * @private
   */
  async _dispatch(toolName, args, userContext) {
    switch (toolName) {
      case 'getUserPlantationsSummary':
        return this._executeGetUserPlantationsSummary(userContext);
      case 'getVerifiedTreeStatus':
        return this._executeGetVerifiedTreeStatus(args.treeId);
      case 'getTreeHealthSummary':
        return this._executeGetTreeHealthSummary(args.treeId);
      case 'getPlatformVerificationSummary':
        return this._executeGetPlatformVerificationSummary(userContext);
      default:
        throw new Error(`Unhandled tool: ${toolName}`);
    }
  }

  /**
   * Handler for getUserPlantationsSummary: Scoped strictly to calling user's id.
   * @private
   */
  async _executeGetUserPlantationsSummary(userContext) {
    const contributorId = userContext.id;

    // Fetch user-scoped count aggregates
    const countSql = `
      SELECT
        COUNT(*)::int AS total,
        COUNT(CASE WHEN status = 'Verified' THEN 1 END)::int AS verified,
        COUNT(CASE WHEN status = 'Pending' THEN 1 END)::int AS pending,
        COUNT(CASE WHEN status = 'Under Review' THEN 1 END)::int AS under_review,
        COUNT(CASE WHEN status = 'Rejected' THEN 1 END)::int AS rejected
      FROM trees
      WHERE contributor_id = $1;
    `;
    const countRes = await this.query(countSql, [contributorId]);
    const counts = countRes.rows[0] || {
      total: 0,
      verified: 0,
      pending: 0,
      under_review: 0,
      rejected: 0,
    };

    // Fetch recent plantations (up to 5) with strictly minimized fields
    const recentTrees = await this.treeRepository.findByContributorId(contributorId, { limit: 5 });
    const minimizedTrees = recentTrees.map(t => ({
      treeId: t.tree_id || null,
      species: t.species,
      status: t.status,
      plantedOn: typeof t.planted_on === 'string' ? t.planted_on.split('T')[0] : t.planted_on,
    }));

    return {
      success: true,
      data: {
        totalTrees: counts.total,
        verifiedCount: counts.verified,
        pendingCount: counts.pending,
        underReviewCount: counts.under_review,
        rejectedCount: counts.rejected,
        recentPlantations: minimizedTrees,
      },
      sourceAttribution: {
        type: 'live_data',
        sourceId: 'TOOL-USER-PLANTATIONS',
        title: 'Contributor Registered Plantations',
        tool: 'getUserPlantationsSummary',
        entityId: null,
      },
    };
  }

  /**
   * Handler for getVerifiedTreeStatus: Only returns verified trees.
   * @private
   */
  async _executeGetVerifiedTreeStatus(treeId) {
    const row = await this.identityRepository.findPublicTreeProfile(treeId);

    // If tree does not exist or is not Verified, return not found without disclosing unverified records
    if (!row || row.status !== 'Verified') {
      return {
        success: true,
        data: {
          found: false,
          treeId,
          message: `Verified tree with identifier "${treeId}" not found.`,
        },
        sourceAttribution: {
          type: 'live_data',
          sourceId: 'TOOL-VERIFIED-TREE',
          title: 'Verified Tree Status Record',
          tool: 'getVerifiedTreeStatus',
          entityId: treeId,
        },
      };
    }

    const latestHealth = await this.treeHealthRepository.findLatestHealthLog(row.id);

    return {
      success: true,
      data: {
        found: true,
        treeId: row.tree_id || treeId,
        species: row.species,
        status: 'Verified',
        plantedOn: typeof row.planted_on === 'string' ? row.planted_on.split('T')[0] : row.planted_on,
        currentHealth: latestHealth ? latestHealth.health_status : 'No observations recorded yet',
      },
      sourceAttribution: {
        type: 'live_data',
        sourceId: 'TOOL-VERIFIED-TREE',
        title: 'Verified Tree Status Record',
        tool: 'getVerifiedTreeStatus',
        entityId: row.tree_id || treeId,
      },
    };
  }

  /**
   * Handler for getTreeHealthSummary: Health observations for a verified tree.
   * @private
   */
  async _executeGetTreeHealthSummary(treeId) {
    const tree = await this.treeHealthRepository.findTreeByIdentifier(treeId);

    if (!tree || tree.status !== 'Verified') {
      return {
        success: true,
        data: {
          found: false,
          treeId,
          message: `Verified tree health records for identifier "${treeId}" not found.`,
        },
        sourceAttribution: {
          type: 'live_data',
          sourceId: 'TOOL-TREE-HEALTH',
          title: 'Tree Health Observations Summary',
          tool: 'getTreeHealthSummary',
          entityId: treeId,
        },
      };
    }

    // Retrieve recent health logs (up to 3)
    const logs = await this.treeHealthRepository.findHealthLogsByTreeId({
      treeId: tree.id,
      limit: 3,
    });

    const recentObservations = logs.map(l => ({
      healthStatus: l.health_status,
      recordedAt: l.recorded_at,
    }));

    return {
      success: true,
      data: {
        found: true,
        treeId: tree.tree_id || treeId,
        currentHealth: logs.length > 0 ? logs[0].health_status : 'No observations recorded yet',
        observationCount: logs.length,
        recentObservations,
      },
      sourceAttribution: {
        type: 'live_data',
        sourceId: 'TOOL-TREE-HEALTH',
        title: 'Tree Health Observations Summary',
        tool: 'getTreeHealthSummary',
        entityId: tree.tree_id || treeId,
      },
    };
  }

  /**
   * Handler for getPlatformVerificationSummary: System-wide verification metrics for admin.
   * @private
   */
  async _executeGetPlatformVerificationSummary(userContext) {
    if (userContext.role !== 'admin') {
      return {
        success: false,
        error: 'ACCESS_DENIED',
        message: 'Platform verification summary is restricted to admin coordinators.',
      };
    }

    const metrics = await this.dashboardRepository.getAdminDashboardMetrics();

    return {
      success: true,
      data: {
        totalPlantations: metrics.plantations?.total || 0,
        verifiedCount: metrics.plantations?.verified || 0,
        pendingCount: metrics.plantations?.pending || 0,
        underReviewCount: metrics.plantations?.underReview || 0,
        rejectedCount: metrics.plantations?.rejected || 0,
      },
      sourceAttribution: {
        type: 'live_data',
        sourceId: 'TOOL-ADMIN-SUMMARY',
        title: 'Platform Verification Metrics',
        tool: 'getPlatformVerificationSummary',
        entityId: null,
      },
    };
  }
}

module.exports = new ToolExecutorService();
module.exports.ToolExecutorService = ToolExecutorService;
module.exports.TOOL_TIMEOUT_MS = TOOL_TIMEOUT_MS;
module.exports.MAX_OUTPUT_CHARS = MAX_OUTPUT_CHARS;
