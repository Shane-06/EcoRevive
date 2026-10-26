const { TOOL_DEFINITIONS, getFunctionDeclarations } = require('../services/ai/toolRegistry');
const { ToolExecutorService } = require('../services/ai/toolExecutor.service');

describe('V2-M3 — Allowlisted Read-Only Tools & Executor Security Suite', () => {
  let mockTreeRepo;
  let mockHealthRepo;
  let mockIdentityRepo;
  let mockDashboardRepo;
  let mockQuery;
  let executor;

  const contributorUser = {
    id: '11111111-1111-4111-8111-111111111111',
    role: 'contributor',
  };

  const caretakerUser = {
    id: '22222222-2222-4222-8222-222222222222',
    role: 'caretaker',
  };

  const adminUser = {
    id: '33333333-3333-4333-8333-333333333333',
    role: 'admin',
  };

  beforeEach(() => {
    mockTreeRepo = {
      findByContributorId: jest.fn().mockResolvedValue([
        {
          id: 'int-uuid-1',
          tree_id: 'ER-PLT-00001',
          species: 'Oak',
          status: 'Verified',
          planted_on: '2026-02-15',
          contributor_id: contributorUser.id,
          photo_reference: 'private/photo.jpg',
          latitude: 12.9716,
          longitude: 77.5946,
        },
      ]),
    };

    mockHealthRepo = {
      findTreeByIdentifier: jest.fn().mockResolvedValue({
        id: 'tree-uuid-1',
        tree_id: 'ER-PLT-00001',
        species: 'Oak',
        status: 'Verified',
      }),
      findLatestHealthLog: jest.fn().mockResolvedValue({
        id: 'hl-uuid-1',
        health_status: 'Healthy',
      }),
      findHealthLogsByTreeId: jest.fn().mockResolvedValue([
        {
          id: 'hl-uuid-1',
          tree_id: 'tree-uuid-1',
          submitted_by: 'caretaker-uuid',
          health_status: 'Healthy',
          recorded_at: '2026-03-01T10:00:00.000Z',
          notes: 'PRIVATE SENSITIVE NOTE: tree has pest treatment',
          photo_reference: 'private/health_photo.jpg',
        },
      ]),
    };

    mockIdentityRepo = {
      findPublicTreeProfile: jest.fn().mockResolvedValue({
        id: 'tree-uuid-1',
        tree_id: 'ER-PLT-00001',
        species: 'Oak',
        status: 'Verified',
        planted_on: '2026-02-15',
        latitude: 12.9716,
        longitude: 77.5946,
      }),
    };

    mockDashboardRepo = {
      getAdminDashboardMetrics: jest.fn().mockResolvedValue({
        plantations: {
          total: 100,
          verified: 75,
          pending: 15,
          underReview: 5,
          rejected: 5,
        },
      }),
    };

    mockQuery = jest.fn().mockResolvedValue({
      rows: [
        {
          total: 1,
          verified: 1,
          pending: 0,
          under_review: 0,
          rejected: 0,
        },
      ],
    });

    executor = new ToolExecutorService({
      treeRepository: mockTreeRepo,
      treeHealthRepository: mockHealthRepo,
      identityRepository: mockIdentityRepo,
      dashboardRepository: mockDashboardRepo,
      query: mockQuery,
    });
  });

  // 1. Tool registry argument validation
  describe('1. Parameter and Argument Validation', () => {
    it('should accept valid arguments for getVerifiedTreeStatus and getTreeHealthSummary', () => {
      const validTreeId = 'ER-PLT-00042';
      const validUuid = '12345678-1234-4234-8234-123456789abc';

      expect(TOOL_DEFINITIONS.getVerifiedTreeStatus.validateArgs({ treeId: validTreeId })).toEqual({
        treeId: validTreeId,
      });
      expect(TOOL_DEFINITIONS.getVerifiedTreeStatus.validateArgs({ treeId: validUuid })).toEqual({
        treeId: validUuid,
      });

      expect(TOOL_DEFINITIONS.getTreeHealthSummary.validateArgs({ treeId: validTreeId })).toEqual({
        treeId: validTreeId,
      });
    });

    it('should reject malformed or SQL-injection arguments for treeId', () => {
      const maliciousInputs = [
        "ER-PLT-00001' OR '1'='1",
        '; DROP TABLE trees; --',
        '../../etc/passwd',
        '<script>alert(1)</script>',
        'NOT-A-TREE-ID',
        'ER-PLT-12', // Not 5 digits
        '',
        null,
      ];

      for (const input of maliciousInputs) {
        expect(() => {
          TOOL_DEFINITIONS.getVerifiedTreeStatus.validateArgs({ treeId: input });
        }).toThrow();
        expect(() => {
          TOOL_DEFINITIONS.getTreeHealthSummary.validateArgs({ treeId: input });
        }).toThrow();
      }
    });

    it('should reject unexpected parameters passed to getUserPlantationsSummary', () => {
      expect(() => {
        TOOL_DEFINITIONS.getUserPlantationsSummary.validateArgs({ userId: 'spoofed-id' });
      }).toThrow(/unexpected parameters/i);
    });

    it('should reject unexpected parameters passed to getPlatformVerificationSummary', () => {
      expect(() => {
        TOOL_DEFINITIONS.getPlatformVerificationSummary.validateArgs({ bypassAuth: true });
      }).toThrow(/unexpected parameters/i);
    });
  });

  // 2. Unknown tool rejection
  describe('2. Unknown Tool Rejection', () => {
    it('should safely reject unknown tool names without executing any operations', async () => {
      const result = await executor.executeTool('executeArbitrarySql', { sql: 'SELECT * FROM users' }, adminUser);

      expect(result.success).toBe(false);
      expect(result.error).toBe('UNKNOWN_TOOL');
      expect(mockQuery).not.toHaveBeenCalled();
    });

    it('should safely reject prototype pollution tool attempts', async () => {
      const result = await executor.executeTool('__proto__', {}, adminUser);
      expect(result.success).toBe(false);
      expect(result.error).toBe('UNKNOWN_TOOL');
    });
  });

  // 3. Role authorization enforcement
  describe('3. Role & Permission Enforcement', () => {
    it('should forbid contributor from executing admin-only getPlatformVerificationSummary', async () => {
      const result = await executor.executeTool('getPlatformVerificationSummary', {}, contributorUser);
      expect(result.success).toBe(false);
      expect(result.error).toBe('UNAUTHORIZED_TOOL');
      expect(mockDashboardRepo.getAdminDashboardMetrics).not.toHaveBeenCalled();
    });

    it('should forbid caretaker from executing contributor getUserPlantationsSummary', async () => {
      const result = await executor.executeTool('getUserPlantationsSummary', {}, caretakerUser);
      expect(result.success).toBe(false);
      expect(result.error).toBe('UNAUTHORIZED_TOOL');
      expect(mockTreeRepo.findByContributorId).not.toHaveBeenCalled();
    });

    it('should allow admin to execute getPlatformVerificationSummary', async () => {
      const result = await executor.executeTool('getPlatformVerificationSummary', {}, adminUser);
      expect(result.success).toBe(true);
      expect(result.data.totalPlantations).toBe(100);
      expect(result.data.verifiedCount).toBe(75);
    });

    it('should filter function declarations presented to model by user role', () => {
      const contributorTools = getFunctionDeclarations('contributor');
      const toolNames = contributorTools.map(t => t.name);

      expect(toolNames).toContain('getUserPlantationsSummary');
      expect(toolNames).toContain('getVerifiedTreeStatus');
      expect(toolNames).toContain('getTreeHealthSummary');
      expect(toolNames).not.toContain('getPlatformVerificationSummary');
    });
  });

  // 4. Identity spoofing prevention
  describe('4. Identity Spoofing & Model Overrides', () => {
    it('should derive contributor ID strictly from authenticated context, ignoring model args', async () => {
      await executor.executeTool('getUserPlantationsSummary', {}, contributorUser);

      // Verify query used contributorUser.id from verified JWT
      expect(mockQuery).toHaveBeenCalledWith(expect.any(String), [contributorUser.id]);
      expect(mockTreeRepo.findByContributorId).toHaveBeenCalledWith(contributorUser.id, { limit: 5 });
    });
  });

  // 5. Non-disclosure of unverified/restricted records
  describe('5. Non-Disclosure & Confidentiality', () => {
    it('should return found=false when querying an unverified or pending tree', async () => {
      mockIdentityRepo.findPublicTreeProfile.mockResolvedValueOnce({
        id: 'pending-tree-id',
        status: 'Pending', // NOT Verified
      });

      const result = await executor.executeTool('getVerifiedTreeStatus', { treeId: 'ER-PLT-00099' }, contributorUser);

      expect(result.success).toBe(true);
      expect(result.data.found).toBe(false);
      expect(result.data.message).toMatch(/not found/i);
    });

    it('should return found=false when querying health records for a non-verified tree', async () => {
      mockHealthRepo.findTreeByIdentifier.mockResolvedValueOnce({
        id: 'rejected-tree-id',
        status: 'Rejected',
      });

      const result = await executor.executeTool('getTreeHealthSummary', { treeId: 'ER-PLT-00088' }, contributorUser);

      expect(result.success).toBe(true);
      expect(result.data.found).toBe(false);
      expect(result.data.message).toMatch(/not found/i);
      expect(mockHealthRepo.findHealthLogsByTreeId).not.toHaveBeenCalled();
    });
  });

  // 6. Data minimization & exclusion of sensitive fields
  describe('6. Data Minimization', () => {
    it('should strip caretaker PII, internal UUIDs, and private notes from health summary', async () => {
      const result = await executor.executeTool('getTreeHealthSummary', { treeId: 'ER-PLT-00001' }, contributorUser);

      expect(result.success).toBe(true);
      expect(result.data.found).toBe(true);
      expect(result.data.currentHealth).toBe('Healthy');

      const observation = result.data.recentObservations[0];
      expect(observation.healthStatus).toBe('Healthy');
      expect(observation.recordedAt).toBeDefined();

      // STRICT EXCLUSIONS:
      expect(observation.notes).toBeUndefined();
      expect(observation.submitted_by).toBeUndefined();
      expect(observation.submittedBy).toBeUndefined();
      expect(observation.photo_reference).toBeUndefined();
      expect(observation.photoReference).toBeUndefined();
      expect(observation.id).toBeUndefined();
    });

    it('should strip internal database UUIDs and GPS coordinates from user plantations summary', async () => {
      const result = await executor.executeTool('getUserPlantationsSummary', {}, contributorUser);

      expect(result.success).toBe(true);
      const tree = result.data.recentPlantations[0];

      expect(tree.treeId).toBe('ER-PLT-00001');
      expect(tree.species).toBe('Oak');
      expect(tree.status).toBe('Verified');
      expect(tree.plantedOn).toBe('2026-02-15');

      // STRICT EXCLUSIONS:
      expect(tree.id).toBeUndefined();
      expect(tree.contributor_id).toBeUndefined();
      expect(tree.contributorId).toBeUndefined();
      expect(tree.latitude).toBeUndefined();
      expect(tree.longitude).toBeUndefined();
      expect(tree.photo_reference).toBeUndefined();
    });
  });

  // 7. Error masking and bounds
  describe('7. Error Masking & Operational Bounding', () => {
    it('should mask database syntax or connection errors without leaking details', async () => {
      mockQuery.mockRejectedValueOnce(new Error('FATAL: connection to server on socket "/var/run/postgresql/.s.PGSQL.5432" failed'));

      const result = await executor.executeTool('getUserPlantationsSummary', {}, contributorUser);

      expect(result.success).toBe(false);
      expect(result.error).toBe('EXECUTION_FAILED');
      expect(result.message).toBe('An error occurred while retrieving platform data.');
      expect(result.message).not.toContain('socket');
      expect(result.message).not.toContain('postgresql');
    });

    it('should reject unauthenticated calls missing userContext', async () => {
      const result = await executor.executeTool('getVerifiedTreeStatus', { treeId: 'ER-PLT-00001' }, null);

      expect(result.success).toBe(false);
      expect(result.error).toBe('AUTHENTICATION_REQUIRED');
    });
  });
});
