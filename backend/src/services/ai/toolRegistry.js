/**
 * EcoRevive V2-M3 — Allowlisted Read-Only Tools Registry
 *
 * Defines explicit tool schemas, parameter validations, and regex patterns.
 * Invariant: Every tool is strictly READ-ONLY. No database mutations or SQL execution.
 */

const TREE_ID_OR_UUID_REGEX = /^(ER-PLT-[0-9]{5}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;

const TOOL_DEFINITIONS = {
  getUserPlantationsSummary: {
    name: 'getUserPlantationsSummary',
    description:
      'Retrieves an aggregated summary and counts of tree plantations registered by the current authenticated contributor, including total count, verified count, pending count, and recent plantation entries (e.g., how many plantations or trees the user has planted or done). Takes no arguments.',
    parameters: {
      type: 'OBJECT',
      properties: {},
      required: [],
    },
    allowedRoles: ['contributor', 'admin'],
    validateArgs: (args) => {
      if (args && typeof args === 'object' && Object.keys(args).length > 0) {
        // Disallow any injected parameter overrides (such as userId, contributorId, etc.)
        const extraKeys = Object.keys(args).filter(k => args[k] !== undefined && args[k] !== null);
        if (extraKeys.length > 0) {
          throw new Error(`getUserPlantationsSummary takes no arguments. Unexpected parameters: ${extraKeys.join(', ')}`);
        }
      }
      return {};
    },
  },

  getVerifiedTreeStatus: {
    name: 'getVerifiedTreeStatus',
    description:
      'Retrieves the public status, species, planting date, and current health status of an approved verified tree by its public Tree ID (ER-PLT-XXXXX) or UUID. Only returns verified trees.',
    parameters: {
      type: 'OBJECT',
      properties: {
        treeId: {
          type: 'STRING',
          description: 'The public Tree ID (e.g., ER-PLT-00001) or tree UUID.',
        },
      },
      required: ['treeId'],
    },
    allowedRoles: ['contributor', 'caretaker', 'admin'],
    validateArgs: (args) => {
      if (!args || typeof args !== 'object') {
        throw new Error('Arguments must be an object with treeId.');
      }
      const { treeId } = args;
      if (!treeId || typeof treeId !== 'string') {
        throw new Error('Parameter "treeId" is required and must be a string.');
      }
      const trimmed = treeId.trim();
      if (!TREE_ID_OR_UUID_REGEX.test(trimmed)) {
        throw new Error(`Invalid treeId "${trimmed}". Format must be ER-PLT-XXXXX (e.g. ER-PLT-00001) or a valid UUID.`);
      }
      return { treeId: trimmed };
    },
  },

  getTreeHealthSummary: {
    name: 'getTreeHealthSummary',
    description:
      'Retrieves recent health monitoring observations (latest health status and observation dates) for an approved verified tree by its public Tree ID (ER-PLT-XXXXX) or UUID. Excludes private caretaker notes.',
    parameters: {
      type: 'OBJECT',
      properties: {
        treeId: {
          type: 'STRING',
          description: 'The public Tree ID (e.g., ER-PLT-00001) or tree UUID.',
        },
      },
      required: ['treeId'],
    },
    allowedRoles: ['contributor', 'caretaker', 'admin'],
    validateArgs: (args) => {
      if (!args || typeof args !== 'object') {
        throw new Error('Arguments must be an object with treeId.');
      }
      const { treeId } = args;
      if (!treeId || typeof treeId !== 'string') {
        throw new Error('Parameter "treeId" is required and must be a string.');
      }
      const trimmed = treeId.trim();
      if (!TREE_ID_OR_UUID_REGEX.test(trimmed)) {
        throw new Error(`Invalid treeId "${trimmed}". Format must be ER-PLT-XXXXX (e.g. ER-PLT-00001) or a valid UUID.`);
      }
      return { treeId: trimmed };
    },
  },

  getPlatformVerificationSummary: {
    name: 'getPlatformVerificationSummary',
    description:
      'Retrieves platform-wide plantation verification metrics and status counts for administrative coordinators. Restricted to admin role.',
    parameters: {
      type: 'OBJECT',
      properties: {},
      required: [],
    },
    allowedRoles: ['admin'],
    validateArgs: (args) => {
      if (args && typeof args === 'object' && Object.keys(args).length > 0) {
        const extraKeys = Object.keys(args).filter(k => args[k] !== undefined && args[k] !== null);
        if (extraKeys.length > 0) {
          throw new Error(`getPlatformVerificationSummary takes no arguments. Unexpected parameters: ${extraKeys.join(', ')}`);
        }
      }
      return {};
    },
  },
};

/**
 * Returns Gemini-compatible function declarations for allowlisted tools.
 * Filters tools by user role if user context is provided.
 * @param {string} [userRole]
 * @returns {Array<object>}
 */
function getFunctionDeclarations(userRole) {
  return Object.values(TOOL_DEFINITIONS)
    .filter(tool => !userRole || tool.allowedRoles.includes(userRole))
    .map(tool => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    }));
}

module.exports = {
  TOOL_DEFINITIONS,
  TREE_ID_OR_UUID_REGEX,
  getFunctionDeclarations,
};
