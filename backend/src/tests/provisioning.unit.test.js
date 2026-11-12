'use strict';

const path = require('path');
const os = require('os');
const crypto = require('crypto');
const {
  provisionProductionUsers,
  PROVISIONING_OUTCOMES,
  EXPECTED_ACCOUNTS,
  EXPECTED_PROJECT_REF,
  EXPECTED_POOLER_HOSTNAME,
  validateDatabaseUrl,
  validateSupabaseUrl,
} = require('../../scripts/provision-prod-users');

describe('Provisioning Script Environment & Hostname Hardening Tests', () => {
  test('Valid production configuration: accepts exact pooler host and project username', () => {
    const validDbUrl = `postgresql://postgres.${EXPECTED_PROJECT_REF}:secretpassword@${EXPECTED_POOLER_HOSTNAME}:5432/postgres`;
    const res = validateDatabaseUrl(validDbUrl, EXPECTED_PROJECT_REF);
    expect(res.hostname).toBe(EXPECTED_POOLER_HOSTNAME);
    expect(res.username).toBe(`postgres.${EXPECTED_PROJECT_REF}`);

    const validSupabaseUrl = `https://${EXPECTED_PROJECT_REF}.supabase.co`;
    const resSupabase = validateSupabaseUrl(validSupabaseUrl, EXPECTED_PROJECT_REF);
    expect(resSupabase.hostname).toBe(`${EXPECTED_PROJECT_REF}.supabase.co`);
  });

  test('Deceptive hostname: rejects deceptive attacker domain with supabase.com substring', () => {
    const deceptiveUrl = `postgresql://postgres.${EXPECTED_PROJECT_REF}:secretpassword@supabase.com.attacker.example:5432/postgres`;
    expect(() => validateDatabaseUrl(deceptiveUrl, EXPECTED_PROJECT_REF)).toThrow(
      /not an approved Supabase host/i
    );
  });

  test('Deceptive hostname: rejects deceptive evil domain with supabase.co substring', () => {
    const deceptiveUrl = `postgresql://postgres.${EXPECTED_PROJECT_REF}:secretpassword@supabase.co.evil.org:5432/postgres`;
    expect(() => validateDatabaseUrl(deceptiveUrl, EXPECTED_PROJECT_REF)).toThrow(
      /not an approved Supabase host/i
    );
  });

  test('Localhost and loopback: rejects localhost and 127.0.0.1', () => {
    const localUrl1 = `postgresql://postgres.${EXPECTED_PROJECT_REF}:secretpassword@localhost:5432/postgres`;
    expect(() => validateDatabaseUrl(localUrl1, EXPECTED_PROJECT_REF)).toThrow(
      /points to a local development database/i
    );

    const localUrl2 = `postgresql://postgres.${EXPECTED_PROJECT_REF}:secretpassword@127.0.0.1:5432/postgres`;
    expect(() => validateDatabaseUrl(localUrl2, EXPECTED_PROJECT_REF)).toThrow(
      /points to a local development database/i
    );
  });

  test('Unrelated project: rejects unrelated Supabase project reference in username', () => {
    const wrongProjectUrl = `postgresql://postgres.someotherproject123:secretpassword@${EXPECTED_POOLER_HOSTNAME}:5432/postgres`;
    expect(() => validateDatabaseUrl(wrongProjectUrl, EXPECTED_PROJECT_REF)).toThrow(
      /does not match required production project/i
    );
  });

  test('Non-exact username: rejects prefixed or suffixed usernames including attacker.postgres.<project>', () => {
    // Prefix attacker test
    const attackerPrefixUrl = `postgresql://attacker.postgres.${EXPECTED_PROJECT_REF}:secretpassword@${EXPECTED_POOLER_HOSTNAME}:5432/postgres`;
    expect(() => validateDatabaseUrl(attackerPrefixUrl, EXPECTED_PROJECT_REF)).toThrow(
      /does not match required production project/i
    );

    // Arbitrary role prefix test
    const adminPrefixUrl = `postgresql://admin.postgres.${EXPECTED_PROJECT_REF}:secretpassword@${EXPECTED_POOLER_HOSTNAME}:5432/postgres`;
    expect(() => validateDatabaseUrl(adminPrefixUrl, EXPECTED_PROJECT_REF)).toThrow(
      /does not match required production project/i
    );

    // Suffix test
    const suffixUrl = `postgresql://postgres.${EXPECTED_PROJECT_REF}.extra:secretpassword@${EXPECTED_POOLER_HOSTNAME}:5432/postgres`;
    expect(() => validateDatabaseUrl(suffixUrl, EXPECTED_PROJECT_REF)).toThrow(
      /does not match required production project/i
    );

    // Non-postgres user with project suffix test
    const customUserUrl = `postgresql://customuser.${EXPECTED_PROJECT_REF}:secretpassword@${EXPECTED_POOLER_HOSTNAME}:5432/postgres`;
    expect(() => validateDatabaseUrl(customUserUrl, EXPECTED_PROJECT_REF)).toThrow(
      /does not match required production project/i
    );
  });

  test('Deceptive SUPABASE_URL: rejects mismatched or deceptive SUPABASE_URL', () => {
    const mismatchedUrl = 'https://unrelatedproject.supabase.co';
    expect(() => validateSupabaseUrl(mismatchedUrl, EXPECTED_PROJECT_REF)).toThrow(
      /does not strictly match expected project/i
    );

    const deceptiveSupabaseUrl = `https://${EXPECTED_PROJECT_REF}.supabase.co.attacker.com`;
    expect(() => validateSupabaseUrl(deceptiveSupabaseUrl, EXPECTED_PROJECT_REF)).toThrow(
      /does not strictly match expected project/i
    );
  });
});

describe('Provisioning Script Safety & State Machine Unit Tests', () => {
  let mockFs;
  let mockStorage;
  let mockDbQueries;
  let mockClient;
  let mockResolverClient;
  let mockUserRepo;
  let mockAuthService;

  beforeEach(() => {
    mockStorage = new Map();
    mockDbQueries = [];

    // Mock File System in-memory
    mockFs = {
      existsSync: jest.fn((p) => mockStorage.has(p)),
      writeFileSync: jest.fn((p, content, opts) => {
        if (opts && opts.flag === 'wx' && mockStorage.has(p)) {
          const err = new Error('EEXIST: file already exists');
          err.code = 'EEXIST';
          throw err;
        }
        mockStorage.set(p, content);
      }),
      readFileSync: jest.fn((p) => {
        if (!mockStorage.has(p)) throw new Error('ENOENT');
        return mockStorage.get(p);
      }),
      unlinkSync: jest.fn((p) => {
        if (!mockStorage.has(p)) throw new Error('ENOENT');
        mockStorage.delete(p);
      }),
    };

    // Mock Database Client
    mockClient = {
      query: jest.fn(async (sql, params = []) => {
        mockDbQueries.push({ sql: sql.trim(), params });
        const trimmed = sql.trim().toUpperCase();

        if (trimmed.startsWith('SELECT ID, EMAIL, ROLE FROM USERS WHERE LOWER(EMAIL) = ANY')) {
          // Pre-check: default empty
          return { rows: [] };
        }

        if (trimmed.startsWith('BEGIN')) {
          return { command: 'BEGIN' };
        }

        if (trimmed.startsWith('INSERT INTO USERS')) {
          const email = params[1];
          const role = params[3];
          const id = crypto.randomUUID();
          return {
            rows: [
              {
                id,
                name: params[0],
                email,
                role,
                created_at: new Date().toISOString(),
              },
            ],
          };
        }

        if (trimmed.startsWith('COMMIT')) {
          return { command: 'COMMIT' };
        }

        if (trimmed.startsWith('ROLLBACK')) {
          return { command: 'ROLLBACK' };
        }

        if (trimmed.startsWith('DELETE FROM USERS WHERE ID = ANY')) {
          return {
            rowCount: params[0].length,
            rows: params[0].map((id) => ({ id, email: 'deleted@test' })),
          };
        }

        return { rows: [] };
      }),
      release: jest.fn(),
    };

    // Mock Resolver Client
    mockResolverClient = {
      query: jest.fn(async (sql, params = []) => {
        mockDbQueries.push({ sql: sql.trim(), params, isResolver: true });
        return { rows: [] };
      }),
      release: jest.fn(),
    };

    // Mock User Repository
    mockUserRepo = {
      findByEmail: jest.fn(async (email) => {
        const found = EXPECTED_ACCOUNTS.find((a) => a.email.toLowerCase() === email.toLowerCase());
        if (!found) return null;
        return {
          id: crypto.randomUUID(),
          name: found.name,
          email: found.email,
          role: found.role,
        };
      }),
    };

    // Mock Auth Service
    mockAuthService = {
      login: jest.fn(async ({ email }) => {
        const found = EXPECTED_ACCOUNTS.find((a) => a.email.toLowerCase() === email.toLowerCase());
        if (!found) throw new Error('Invalid credentials');
        return {
          user: { id: crypto.randomUUID(), email: found.email, role: found.role },
          token: 'mock-jwt-token-123',
        };
      }),
    };
  });

  // ==========================================================================
  // Outcome A: Confirmed Pre-Commit Failure
  // ==========================================================================
  test('Outcome A: Pre-commit failure issues ROLLBACK and cleans up staged credential file', async () => {
    const testDeliveryPath = path.join(os.tmpdir(), `test-prov-a-${Date.now()}.json`);

    await expect(
      provisionProductionUsers({
        getClient: async () => mockClient,
        closePool: async () => {},
        userRepository: mockUserRepo,
        authService: mockAuthService,
        fs: mockFs,
        deliveryFilePath: testDeliveryPath,
        testHooks: {
          failDuringInsertion: true,
        },
      })
    ).rejects.toThrow('Simulated insertion failure prior to commit');

    const rollbackCalls = mockDbQueries.filter((q) => q.sql.includes('ROLLBACK'));
    expect(rollbackCalls.length).toBe(1);

    const deleteCalls = mockDbQueries.filter((q) => q.sql.includes('DELETE FROM users'));
    expect(deleteCalls.length).toBe(0);

    expect(mockStorage.has(testDeliveryPath)).toBe(false);
  });

  // ==========================================================================
  // Test 1: Ambiguous COMMIT where matching emails/roles exist but IDs differ
  // ==========================================================================
  test('Test 1: Ambiguous COMMIT where matching emails/roles exist but IDs differ preserves credentials and does NOT delete', async () => {
    const testDeliveryPath = path.join(os.tmpdir(), `test-t1-${Date.now()}.json`);

    // Resolver returns records with completely different UUIDs (e.g. foreign accounts)
    const foreignAccountsInDb = EXPECTED_ACCOUNTS.map((a) => ({
      id: crypto.randomUUID(), // different ID
      name: a.name,
      email: a.email,
      role: a.role,
      created_at: new Date().toISOString(),
    }));

    mockResolverClient.query.mockImplementation(async () => ({
      rows: foreignAccountsInDb,
    }));

    let thrownError = null;
    try {
      await provisionProductionUsers({
        getClient: async () => mockClient,
        closePool: async () => {},
        userRepository: mockUserRepo,
        authService: mockAuthService,
        fs: mockFs,
        deliveryFilePath: testDeliveryPath,
        testHooks: {
          failCommitWithNetworkDrop: new Error('ECONNRESET: socket closed during commit'),
          mockResolverClient,
          resolverPollIntervalMs: 0,
        },
      });
    } catch (err) {
      thrownError = err;
    }

    expect(thrownError).not.toBeNull();
    expect(thrownError.outcome).toBe(PROVISIONING_OUTCOMES.AMBIGUOUS_UNRESOLVED);

    // Staged delivery file MUST be preserved for manual review
    expect(mockStorage.has(testDeliveryPath)).toBe(true);

    // Compensating deletion MUST NEVER run against records with different IDs!
    const deleteQueries = mockDbQueries.filter((q) => q.sql.includes('DELETE FROM users'));
    expect(deleteQueries.length).toBe(0);
  });

  // ==========================================================================
  // Test 2: Compensating deletion throws a database/network error
  // ==========================================================================
  test('Test 2: Compensating deletion throws error -> credentials preserved for manual review', async () => {
    const testDeliveryPath = path.join(os.tmpdir(), `test-t2-${Date.now()}.json`);

    let thrownError = null;
    try {
      await provisionProductionUsers({
        getClient: async () => mockClient,
        closePool: async () => {},
        userRepository: mockUserRepo,
        authService: mockAuthService,
        fs: mockFs,
        deliveryFilePath: testDeliveryPath,
        testHooks: {
          failPostCommitVerification: new Error('Definitive role mismatch'),
          failCompensatingDeletion: new Error('DB connection terminated during compensating deletion'),
        },
      });
    } catch (err) {
      thrownError = err;
    }

    expect(thrownError).not.toBeNull();
    expect(thrownError.outcome).toBe(PROVISIONING_OUTCOMES.POST_COMMIT_VERIFICATION_FAILURE);

    // Staged credential file MUST BE PRESERVED when deletion threw an error
    expect(mockStorage.has(testDeliveryPath)).toBe(true);
  });

  // ==========================================================================
  // Test 3: Compensating deletion removes fewer than expected records
  // ==========================================================================
  test('Test 3: Incomplete compensating deletion -> credentials preserved for manual review', async () => {
    const testDeliveryPath = path.join(os.tmpdir(), `test-t3-${Date.now()}.json`);

    // Override mockClient query to simulate incomplete delete (returns only 1 row deleted instead of 2)
    const originalQuery = mockClient.query;
    mockClient.query = jest.fn(async (sql, params) => {
      if (sql.trim().toUpperCase().startsWith('DELETE FROM USERS WHERE ID = ANY')) {
        return {
          rowCount: 1, // Only 1 deleted
          rows: [{ id: params[0][0], email: 'partial@test' }],
        };
      }
      return originalQuery(sql, params);
    });

    let thrownError = null;
    try {
      await provisionProductionUsers({
        getClient: async () => mockClient,
        closePool: async () => {},
        userRepository: mockUserRepo,
        authService: mockAuthService,
        fs: mockFs,
        deliveryFilePath: testDeliveryPath,
        testHooks: {
          failPostCommitVerification: new Error('Definitive authentication failure'),
        },
      });
    } catch (err) {
      thrownError = err;
    }

    expect(thrownError).not.toBeNull();
    expect(thrownError.outcome).toBe(PROVISIONING_OUTCOMES.POST_COMMIT_VERIFICATION_FAILURE);

    // Staged credential file MUST BE PRESERVED when deletion was incomplete
    expect(mockStorage.has(testDeliveryPath)).toBe(true);
  });

  // ==========================================================================
  // Test 4: Compensating deletion succeeds and all exact IDs confirmed deleted
  // ==========================================================================
  test('Test 4: Compensating deletion succeeds with all exact IDs deleted -> credential file is safely removed', async () => {
    const testDeliveryPath = path.join(os.tmpdir(), `test-t4-${Date.now()}.json`);

    let thrownError = null;
    try {
      await provisionProductionUsers({
        getClient: async () => mockClient,
        closePool: async () => {},
        userRepository: mockUserRepo,
        authService: mockAuthService,
        fs: mockFs,
        deliveryFilePath: testDeliveryPath,
        testHooks: {
          failPostCommitVerification: new Error('Definitive authentication failure'),
        },
      });
    } catch (err) {
      thrownError = err;
    }

    expect(thrownError).not.toBeNull();
    expect(thrownError.outcome).toBe(PROVISIONING_OUTCOMES.POST_COMMIT_VERIFICATION_FAILURE);

    // Delivery file is cleaned up ONLY because all exact IDs were verified deleted
    expect(mockStorage.has(testDeliveryPath)).toBe(false);

    // Verify deletion query was called with 2 IDs
    const deleteQueries = mockDbQueries.filter((q) => q.sql.includes('DELETE FROM users WHERE id = ANY'));
    expect(deleteQueries.length).toBe(1);
    expect(deleteQueries[0].params[0].length).toBe(2);
  });

  // ==========================================================================
  // Test 5: Transient post-commit verification failure
  // ==========================================================================
  test('Test 5: Transient post-commit verification failure preserves credentials and does NOT delete accounts', async () => {
    const testDeliveryPath = path.join(os.tmpdir(), `test-t5-${Date.now()}.json`);

    const transientNetworkError = new Error('getaddrinfo ENOTFOUND aws-1-ap-south-1.pooler.supabase.com');
    transientNetworkError.code = 'ENOTFOUND';

    let thrownError = null;
    try {
      await provisionProductionUsers({
        getClient: async () => mockClient,
        closePool: async () => {},
        userRepository: mockUserRepo,
        authService: mockAuthService,
        fs: mockFs,
        deliveryFilePath: testDeliveryPath,
        testHooks: {
          failPostCommitVerification: transientNetworkError,
        },
      });
    } catch (err) {
      thrownError = err;
    }

    expect(thrownError).not.toBeNull();
    expect(thrownError.outcome).toBe(PROVISIONING_OUTCOMES.TRANSIENT_VERIFICATION_FAILURE);

    // Credentials PRESERVED
    expect(mockStorage.has(testDeliveryPath)).toBe(true);

    // Zero deletions triggered on transient error
    const deleteQueries = mockDbQueries.filter((q) => q.sql.includes('DELETE FROM users'));
    expect(deleteQueries.length).toBe(0);
  });

  // ==========================================================================
  // Requirement 5: Ambiguous COMMIT where resolver initially sees 0 rows, then commits
  // ==========================================================================
  test('Requirement 5: Ambiguous COMMIT where resolver initially sees 0 rows but transaction subsequently commits preserves credentials and does NOT delete', async () => {
    const testDeliveryPath = path.join(os.tmpdir(), `test-req5-${Date.now()}.json`);

    let capturedInsertedRecords = [];
    const originalQuery = mockClient.query;
    mockClient.query = jest.fn(async (sql, params) => {
      const res = await originalQuery(sql, params);
      if (sql.trim().toUpperCase().startsWith('INSERT INTO USERS')) {
        capturedInsertedRecords.push(res.rows[0]);
      }
      return res;
    });

    let pollCount = 0;
    mockResolverClient.query.mockImplementation(async () => {
      pollCount++;
      if (pollCount === 1) {
        return { rows: [] }; // initially 0 rows!
      }
      return { rows: capturedInsertedRecords }; // subsequently committed!
    });

    const result = await provisionProductionUsers({
      getClient: async () => mockClient,
      closePool: async () => {},
      userRepository: mockUserRepo,
      authService: mockAuthService,
      fs: mockFs,
      deliveryFilePath: testDeliveryPath,
      testHooks: {
        failCommitWithNetworkDrop: new Error('ETIMEDOUT: Connection timed out waiting for COMMIT ack'),
        mockResolverClient,
        maxResolverPollRetries: 3,
        resolverPollIntervalMs: 10,
      },
    });

    expect(result.success).toBe(true);
    expect(result.outcome).toBe(PROVISIONING_OUTCOMES.CONFIRMED_COMMITTED_SUCCESS);

    expect(pollCount).toBeGreaterThanOrEqual(2);
    expect(mockStorage.has(testDeliveryPath)).toBe(true);

    const deleteQueries = mockDbQueries.filter((q) => q.sql.includes('DELETE FROM users'));
    expect(deleteQueries.length).toBe(0);
  });

  // ==========================================================================
  // Requirement 6: Genuinely confirmed abort (Explicit PostgreSQL Abort Code)
  // ==========================================================================
  test('Requirement 6: Genuinely confirmed abort (explicit PG abort code + 0 rows) safely removes credential file', async () => {
    const testDeliveryPath = path.join(os.tmpdir(), `test-req6-${Date.now()}.json`);

    const pgAbortError = new Error('ERROR: could not serialize access due to concurrent update');
    pgAbortError.code = '40001';

    mockResolverClient.query.mockImplementation(async () => ({
      rows: [],
    }));

    let thrownError = null;
    try {
      await provisionProductionUsers({
        getClient: async () => mockClient,
        closePool: async () => {},
        userRepository: mockUserRepo,
        authService: mockAuthService,
        fs: mockFs,
        deliveryFilePath: testDeliveryPath,
        testHooks: {
          failCommitWithNetworkDrop: pgAbortError,
          mockResolverClient,
          maxResolverPollRetries: 2,
          resolverPollIntervalMs: 0,
        },
      });
    } catch (err) {
      thrownError = err;
    }

    expect(thrownError).not.toBeNull();
    expect(thrownError.outcome).toBe(PROVISIONING_OUTCOMES.CONFIRMED_ABORTED);
    expect(mockStorage.has(testDeliveryPath)).toBe(false);

    const deleteQueries = mockDbQueries.filter((q) => q.sql.includes('DELETE FROM users'));
    expect(deleteQueries.length).toBe(0);
  });

  // ==========================================================================
  // Zero rows after network drop (without explicit abort code) -> UNRESOLVED
  // ==========================================================================
  test('Zero rows after network drop without explicit abort code must NOT assume abort -> AMBIGUOUS_UNRESOLVED and preserves credentials', async () => {
    const testDeliveryPath = path.join(os.tmpdir(), `test-zero-rows-unres-${Date.now()}.json`);

    const networkDropError = new Error('read ECONNRESET');
    networkDropError.code = 'ECONNRESET';

    mockResolverClient.query.mockImplementation(async () => ({
      rows: [],
    }));

    let thrownError = null;
    try {
      await provisionProductionUsers({
        getClient: async () => mockClient,
        closePool: async () => {},
        userRepository: mockUserRepo,
        authService: mockAuthService,
        fs: mockFs,
        deliveryFilePath: testDeliveryPath,
        testHooks: {
          failCommitWithNetworkDrop: networkDropError,
          mockResolverClient,
          maxResolverPollRetries: 2,
          resolverPollIntervalMs: 0,
        },
      });
    } catch (err) {
      thrownError = err;
    }

    expect(thrownError).not.toBeNull();
    expect(thrownError.outcome).toBe(PROVISIONING_OUTCOMES.AMBIGUOUS_UNRESOLVED);
    expect(thrownError.outcome).not.toBe(PROVISIONING_OUTCOMES.CONFIRMED_ABORTED);

    expect(mockStorage.has(testDeliveryPath)).toBe(true);

    const deleteQueries = mockDbQueries.filter((q) => q.sql.includes('DELETE FROM users'));
    expect(deleteQueries.length).toBe(0);
  });
});
