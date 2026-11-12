'use strict';

/**
 * EcoRevive — Production Administrative Account Provisioning Script
 * Location: backend/scripts/provision-prod-users.js
 * 
 * Safety & Transaction Model:
 * 1. Strict environment loading (backend/.env only, with explicit override).
 * 2. Hardened validation of production identity:
 *    - Validates exact pooler host: 'aws-1-ap-south-1.pooler.supabase.com' (or strict approved pooler regex).
 *    - Rejects deceptive hostnames (e.g. 'supabase.com.attacker.example', 'supabase.co.evil.org').
 *    - Rejects localhost, 127.0.0.1, and loopback addresses.
 *    - Validates exact project reference in database username ('postgres.gpbaqzvntgmpghcprqgc').
 *    - Validates exact SUPABASE_URL hostname strictly equals 'gpbaqzvntgmpghcprqgc.supabase.co'.
 * 3. Cryptographic password generation (24 chars, high entropy) & in-memory bcrypt self-test.
 * 4. Idempotent pre-check preventing collision with or overwrite of existing accounts.
 * 5. Atomic database transaction with parameterized SQL statements.
 * 6. Secure credential staging: Credential delivery file is created using exclusive file creation
 *    ('wx') BEFORE committing the database transaction. If file creation fails, the transaction
 *    is rolled back, preventing any "unrecoverable account" state.
 * 7. State Machine & Ambiguous COMMIT Resolution:
 *    - Polling resolver accounts for in-flight commits delayed by network/pooler latency.
 *    - Compares resolver records against the EXACT IDs generated during this execution's INSERT.
 *    - Requires exact 1-to-1 match of ID, email, and role for both accounts.
 *    - If IDs differ, missing, or inconsistent: classifies as AMBIGUOUS_UNRESOLVED, preserves
 *      credential file, and NEVER executes compensating deletion.
 *    - Zero-row rule: A zero-row observation after an ambiguous COMMIT does NOT establish that the
 *      transaction was aborted unless PostgreSQL explicitly returned a transaction-aborting error code.
 *      Transport/network errors with 0 rows remain AMBIGUOUS_UNRESOLVED with credentials preserved.
 *    - Definitive abort is confirmed ONLY when PostgreSQL explicitly returns an abort code (e.g. 40001,
 *      40P01, 25P02) AND 0 rows exist in the database.
 * 8. Post-Commit Verification & Failure Isolation:
 *    - Distinguishes transient/infrastructure failures from definitive verification failures.
 *    - Transient network/connection errors preserve credentials and halt for manual review without deletion.
 *    - Definitive failures execute compensating deletion ONLY for the exact created IDs.
 *    - Verifies that EVERY created ID was positively deleted before removing the delivery file.
 *    - If deletion throws or is incomplete, credentials are preserved for manual review.
 * 9. Guaranteed resource cleanup: releases client and closes connection pool in all paths.
 * 10. Zero logging policy: no plaintext passwords, hashes, JWTs, or secrets in terminal logs.
 */

const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');
const dotenv = require('dotenv');

// ============================================================================
// Constants & Outcomes
// ============================================================================
const EXPECTED_PROJECT_REF = 'gpbaqzvntgmpghcprqgc';
const EXPECTED_POOLER_HOSTNAME = 'aws-1-ap-south-1.pooler.supabase.com';

const EXPECTED_ACCOUNTS = [
  {
    name: 'System Administrator',
    email: 'admin@ecorevive.local',
    role: 'admin',
  },
  {
    name: 'Head Caretaker',
    email: 'caretaker@ecorevive.local',
    role: 'caretaker',
  },
];

const PROVISIONING_OUTCOMES = {
  CONFIRMED_COMMITTED_SUCCESS: 'CONFIRMED_COMMITTED_SUCCESS',
  PRE_COMMIT_FAILURE: 'PRE_COMMIT_FAILURE',
  CONFIRMED_ABORTED: 'CONFIRMED_ABORTED',
  AMBIGUOUS_UNRESOLVED: 'AMBIGUOUS_UNRESOLVED',
  POST_COMMIT_VERIFICATION_FAILURE: 'POST_COMMIT_VERIFICATION_FAILURE',
  TRANSIENT_VERIFICATION_FAILURE: 'TRANSIENT_VERIFICATION_FAILURE',
};

// ============================================================================
// 1. Hardened Production Environment Validation
// ============================================================================
function validateDatabaseUrl(dbUrl, expectedProjectRef = EXPECTED_PROJECT_REF) {
  if (!dbUrl || typeof dbUrl !== 'string' || dbUrl.trim() === '') {
    throw new Error('DATABASE_URL is not defined in the backend environment.');
  }

  let parsed;
  try {
    parsed = new URL(dbUrl);
  } catch (_e) {
    throw new Error('DATABASE_URL is not a valid URL.');
  }

  const hostname = (parsed.hostname || '').toLowerCase();

  // Guard 1: Reject localhost or loopback addresses
  if (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '::1' ||
    hostname.startsWith('127.') ||
    hostname.endsWith('.localhost')
  ) {
    throw new Error('Refusing to run: DATABASE_URL points to a local development database.');
  }

  // Guard 2: Reject deceptive hostnames via strict pattern and approved pooler check
  // The host must strictly equal the known production pooler OR match the strict AWS Supabase pooler pattern
  const isApprovedPooler =
    hostname === EXPECTED_POOLER_HOSTNAME ||
    /^aws-\d+-[a-z0-9-]+\.pooler\.supabase\.com$/.test(hostname) ||
    hostname === `db.${expectedProjectRef}.supabase.co`;

  if (!isApprovedPooler) {
    throw new Error(
      `Refusing to run: DATABASE_URL hostname "${hostname}" is not an approved Supabase host for project "${expectedProjectRef}".`
    );
  }

  // Guard 3: Reject deceptive domains containing "supabase" as a subdomain of an external attacker domain
  const isStrictSupabaseDomain =
    hostname.endsWith('.pooler.supabase.com') ||
    hostname.endsWith('.supabase.co') ||
    hostname.endsWith('.supabase.com');

  if (!isStrictSupabaseDomain) {
    throw new Error(`Refusing to run: DATABASE_URL host "${hostname}" is outside approved Supabase infrastructure.`);
  }

  // Guard 4: Validate exact project reference in database username
  // In Supabase pooler connections, the username is strictly formatted as: postgres.<project-ref>
  const username = decodeURIComponent(parsed.username || '');
  const expectedUsername = `postgres.${expectedProjectRef}`;
  if (username !== expectedUsername) {
    throw new Error(
      `Refusing to run: Target database username "${username}" does not match required production project "${expectedProjectRef}".`
    );
  }

  return { hostname, username, parsed };
}

function validateSupabaseUrl(supabaseUrl, expectedProjectRef = EXPECTED_PROJECT_REF) {
  if (!supabaseUrl || typeof supabaseUrl !== 'string' || supabaseUrl.trim() === '') {
    throw new Error('SUPABASE_URL is not defined in the backend environment.');
  }

  let parsed;
  try {
    parsed = new URL(supabaseUrl);
  } catch (_e) {
    throw new Error('SUPABASE_URL is not a valid URL.');
  }

  const hostname = (parsed.hostname || '').toLowerCase();
  const expectedHost = `${expectedProjectRef}.supabase.co`;

  if (hostname !== expectedHost) {
    throw new Error(
      `Refusing to run: SUPABASE_URL hostname "${hostname}" does not strictly match expected project "${expectedHost}".`
    );
  }

  return { hostname, parsed };
}

function loadAndValidateProductionEnvironment(customEnvPath = null) {
  const backendEnvPath = customEnvPath || path.resolve(__dirname, '../.env');

  if (!fs.existsSync(backendEnvPath)) {
    throw new Error(`Production environment file not found at: ${backendEnvPath}`);
  }

  // Explicitly parse and load backend/.env with override: true
  const envConfig = dotenv.parse(fs.readFileSync(backendEnvPath, 'utf-8'));
  for (const key in envConfig) {
    process.env[key] = envConfig[key];
  }

  // Validate DATABASE_URL and SUPABASE_URL using the hardened validators
  validateDatabaseUrl(process.env.DATABASE_URL, EXPECTED_PROJECT_REF);
  validateSupabaseUrl(process.env.SUPABASE_URL, EXPECTED_PROJECT_REF);

  // Guard: Resolve SSL CA certificate path to absolute path
  if (process.env.DB_SSL_CA) {
    const resolvedCaPath = path.resolve(__dirname, '..', process.env.DB_SSL_CA);
    if (fs.existsSync(resolvedCaPath)) {
      process.env.DB_SSL_CA = resolvedCaPath;
    }
  }

  // Switch working directory to backend
  process.chdir(path.resolve(__dirname, '..'));
}

// ============================================================================
// 2. Error Categorization Helpers
// ============================================================================
function isTransientOrInfrastructureError(err) {
  if (!err) return false;
  if (err.isTransient) return true;

  const msg = (err.message || '').toLowerCase();
  const code = (err.code || '').toLowerCase();

  // Network / Socket errors
  if (['econnreset', 'etimedout', 'econnrefused', 'enotfound', 'eai_again', 'epipe'].includes(code)) {
    return true;
  }
  // PostgreSQL server disconnect / admin shutdown error codes
  if (code.startsWith('08') || code === '57p01' || code === '57p02' || code === '57p03') {
    return true;
  }
  // Generic network message patterns
  if (
    msg.includes('connection terminated') ||
    msg.includes('connection timeout') ||
    msg.includes('network error') ||
    msg.includes('socket hang up') ||
    msg.includes('econnrefused') ||
    msg.includes('etimedout')
  ) {
    return true;
  }

  return false;
}

/**
 * Checks whether PostgreSQL returned an explicit error indicating that the
 * transaction was definitively aborted by the database engine itself.
 */
function isDefinitivePostgresAbortError(err) {
  if (!err) return false;
  const code = (err.code || '').toUpperCase();
  // Class 40: Transaction Rollback (e.g. 40001 serialization_failure, 40P01 deadlock_detected)
  if (code.startsWith('40')) return true;
  // Class 25: Invalid Transaction State (e.g. 25P02 in_failed_sql_transaction)
  if (code === '25P02') return true;
  // Class 23: Integrity Constraint Violation during deferred commit check
  if (code.startsWith('23')) return true;
  return false;
}

// ============================================================================
// 3. Cryptographically Strong Password Generation
// ============================================================================
function generateSecurePassword(length = 24) {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // Exclude ambiguous I, O
  const lower = 'abcdefghijkmnopqrstuvwxyz'; // Exclude ambiguous l
  const digits = '23456789';               // Exclude ambiguous 0, 1
  const symbols = '!@#$%&*-_=+?';
  const allChars = upper + lower + digits + symbols;

  const chars = [
    upper[crypto.randomInt(0, upper.length)],
    lower[crypto.randomInt(0, lower.length)],
    digits[crypto.randomInt(0, digits.length)],
    symbols[crypto.randomInt(0, symbols.length)],
  ];

  for (let i = 4; i < length; i++) {
    chars.push(allChars[crypto.randomInt(0, allChars.length)]);
  }

  // Fisher-Yates cryptographically unbiased shuffle
  for (let i = chars.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  return chars.join('');
}

// ============================================================================
// 4. Ambiguous COMMIT Resolver (Exact ID Matching & Delayed Polling)
// ============================================================================
async function resolveAmbiguousCommit({
  getClient,
  targetAccounts,
  createdUserRecords = [],
  originalError,
  testHooks = {},
}) {
  const maxRetries = testHooks.maxResolverPollRetries !== undefined ? testHooks.maxResolverPollRetries : 3;
  const pollIntervalMs = testHooks.resolverPollIntervalMs !== undefined ? testHooks.resolverPollIntervalMs : 500;

  let resolverClient = null;
  let querySucceeded = false;
  let foundRecords = [];
  let queryError = null;

  // Poll for account existence across retries to account for in-flight commit lag
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    querySucceeded = false;
    queryError = null;

    try {
      if (testHooks.mockResolverClient) {
        resolverClient = testHooks.mockResolverClient;
      } else {
        resolverClient = await getClient();
      }

      if (testHooks.resolverQueryError) {
        throw testHooks.resolverQueryError;
      }

      if (testHooks.resolverPollResponses && testHooks.resolverPollResponses[attempt - 1]) {
        foundRecords = testHooks.resolverPollResponses[attempt - 1].rows || [];
      } else {
        const targetEmails = targetAccounts.map((a) => a.email.toLowerCase());
        const res = await resolverClient.query(
          'SELECT id, name, email, role, created_at FROM users WHERE LOWER(email) = ANY($1::text[]);',
          [targetEmails]
        );
        foundRecords = res.rows || [];
      }
      querySucceeded = true;
    } catch (connErr) {
      queryError = connErr;
    } finally {
      if (resolverClient && !testHooks.mockResolverClient) {
        try {
          resolverClient.release();
        } catch (_e) {}
      }
    }

    if (!querySucceeded) {
      if (attempt < maxRetries && pollIntervalMs > 0) {
        await new Promise((r) => setTimeout(r, pollIntervalMs));
      }
      continue;
    }

    // Step A: Check for exact 1-to-1 match of all created records
    if (createdUserRecords.length > 0 && foundRecords.length === createdUserRecords.length) {
      const exactMatch = createdUserRecords.every((created) => {
        const row = foundRecords.find(
          (r) =>
            r.id === created.id &&
            r.email.toLowerCase() === created.email.toLowerCase() &&
            r.role === created.role
        );
        return Boolean(row);
      });

      if (exactMatch) {
        return {
          status: 'CONFIRMED_COMMITTED',
          foundRecords,
          attempt,
        };
      } else {
        // Accounts exist but IDs do not match: foreign/concurrent accounts
        return {
          status: 'AMBIGUOUS_UNRESOLVED',
          reason: 'Matching email/role accounts exist in database, but their IDs do not match the exact records created by this execution.',
          foundRecords,
          attempt,
        };
      }
    }

    // Step B: Partial account count found
    if (foundRecords.length > 0) {
      return {
        status: 'AMBIGUOUS_UNRESOLVED',
        reason: `Inconsistent account count found in database: ${foundRecords.length} found, expected ${createdUserRecords.length}.`,
        foundRecords,
        attempt,
      };
    }

    // Step C: Zero rows observed on this attempt:
    // If attempts remain, wait pollIntervalMs to allow any pending in-flight commit to land
    if (attempt < maxRetries && pollIntervalMs > 0) {
      await new Promise((r) => setTimeout(r, pollIntervalMs));
    }
  }

  // After all poll attempts:
  if (!querySucceeded) {
    return {
      status: 'AMBIGUOUS_UNRESOLVED',
      reason: `Resolver query failed after ${maxRetries} attempt(s): ${queryError ? queryError.message : 'Unknown connection error'}`,
      originalError,
      queryError,
    };
  }

  // Critical Fix: Can we establish a DEFINITIVE abort?
  const hasDefinitiveAbortError = isDefinitivePostgresAbortError(originalError);

  if (hasDefinitiveAbortError) {
    // PostgreSQL explicitly returned a transaction-aborting SQL error code (e.g. 40001, 40P01, 25P02)
    // AND the resolver confirmed 0 rows exist in the database.
    return {
      status: 'CONFIRMED_ABORTED',
      foundRecords: [],
      reason: `Definitive database abort confirmed: PostgreSQL returned explicit abort code (${originalError.code}) and 0 rows exist in database.`,
    };
  }

  // Otherwise, the commit failure was a network or connection drop (e.g. ECONNRESET, timeout).
  // A zero-row observation in a pooled/remote environment CANNOT establish that PostgreSQL aborted.
  // Safety rule: Prefer AMBIGUOUS_UNRESOLVED and preserve credentials.
  return {
    status: 'AMBIGUOUS_UNRESOLVED',
    reason: `Zero accounts observed across ${maxRetries} poll attempt(s) after ambiguous COMMIT. Because the failure was a network/transport error (${originalError ? originalError.message : 'unknown'}), definitive abort cannot be established. Preserving credentials for manual verification.`,
    foundRecords: [],
  };
}

// ============================================================================
// 5. Main Provisioning State Machine
// ============================================================================
async function provisionProductionUsers(deps = {}) {
  const defaultDb = require('../src/config/db');
  const defaultPassword = require('../src/utils/password');
  const defaultUserRepo = require('../src/repositories/user.repository');
  const defaultAuthService = require('../src/services/auth.service');

  const getClient = deps.getClient || defaultDb.getClient;
  const closePool = deps.closePool || defaultDb.closePool;
  const hashPassword = deps.hashPassword || defaultPassword.hashPassword;
  const comparePassword = deps.comparePassword || defaultPassword.comparePassword;
  const userRepository = deps.userRepository || defaultUserRepo;
  const authService = deps.authService || defaultAuthService;
  const fileSystem = deps.fs || fs;
  const operatingSystem = deps.os || os;
  const testHooks = deps.testHooks || {};

  console.log('=== EcoRevive Production Account Provisioning ===\n');
  console.log('[Target Project ID] Verified:', EXPECTED_PROJECT_REF);
  console.log('[Environment]       Production Supabase PostgreSQL (via TLS Pooler)');

  // Credential delivery file placed strictly in OS temp directory outside repository workspace
  const ephemeralDeliveryId = crypto.randomBytes(12).toString('hex');
  const deliveryFilePath = deps.deliveryFilePath || path.join(
    operatingSystem.tmpdir(),
    `ecorevive-provision-${ephemeralDeliveryId}.json`
  );

  let client = null;
  let transactionActive = false;
  let commitAttempted = false;
  let commitConfirmed = false;
  let deliveryFileCreated = false;
  let createdUserRecords = [];

  // Helper: clean up delivery file safely
  const safeCleanupDeliveryFile = () => {
    try {
      if (fileSystem.existsSync(deliveryFilePath)) {
        fileSystem.unlinkSync(deliveryFilePath);
        console.log('[Cleanup] Ephemeral credential delivery file safely removed.');
      }
    } catch (cleanupErr) {
      console.error('[Cleanup Warning] Failed to delete ephemeral file:', cleanupErr.message);
    }
  };

  try {
    // Generate passwords and prepare accounts in memory
    const accounts = EXPECTED_ACCOUNTS.map((acc) => ({
      name: acc.name,
      email: acc.email.toLowerCase(),
      role: acc.role,
      password: (testHooks.fixedPasswords && testHooks.fixedPasswords[acc.email]) || generateSecurePassword(24),
    }));

    // Pre-verify password hashing in memory before database operations
    console.log('[Security] Generating salted bcrypt hashes (10 rounds)...');
    for (const acc of accounts) {
      acc.passwordHash = await hashPassword(acc.password);
      const preTestMatch = await comparePassword(acc.password, acc.passwordHash);
      if (!preTestMatch) {
        throw new Error(`In-memory hash self-test failed for ${acc.email}.`);
      }
    }

    client = await getClient();
    console.log('[Database] Connected to PostgreSQL client pool.');

    // Step A: Idempotency pre-check
    const targetEmails = accounts.map((a) => a.email);
    const existingCheck = await client.query(
      'SELECT id, email, role FROM users WHERE LOWER(email) = ANY($1::text[]);',
      [targetEmails]
    );

    if (existingCheck.rows && existingCheck.rows.length > 0) {
      const conflicts = existingCheck.rows
        .map((r) => `${r.email} (${r.role})`)
        .join(', ');
      const preCheckErr = new Error(
        `Pre-check failed: Account(s) already exist in database: [${conflicts}]. Existing accounts are never overwritten.`
      );
      preCheckErr.outcome = PROVISIONING_OUTCOMES.PRE_COMMIT_FAILURE;
      throw preCheckErr;
    }
    console.log('[Idempotency Check] PASS: Neither target account exists in database.');

    // Step B: Transactional insertion
    console.log('[Transaction] Beginning database transaction...');
    await client.query('BEGIN');
    transactionActive = true;

    if (testHooks.failDuringInsertion) {
      throw new Error('Simulated insertion failure prior to commit.');
    }

    for (const acc of accounts) {
      const insertSql = `
        INSERT INTO users (name, email, password_hash, role)
        VALUES ($1, $2, $3, $4)
        RETURNING id, name, email, role, created_at;
      `;
      const res = await client.query(insertSql, [
        acc.name,
        acc.email,
        acc.passwordHash,
        acc.role,
      ]);
      const created = res.rows[0];
      createdUserRecords.push(created);
      console.log(`[Inserted] ${created.email} | Role: ${created.role} | ID: ${created.id}`);
    }

    // Step C: Secure Credential Staging BEFORE Commit
    console.log('[Delivery Staging] Writing ephemeral credential file BEFORE committing transaction...');
    const deliveryPayload = {
      timestamp: new Date().toISOString(),
      projectRef: EXPECTED_PROJECT_REF,
      accounts: accounts.map((a) => ({
        name: a.name,
        email: a.email,
        role: a.role,
        password: a.password,
      })),
      retrievalNotice: 'One-time credentials. Retrieve immediately and delete file.',
    };

    fileSystem.writeFileSync(deliveryFilePath, JSON.stringify(deliveryPayload, null, 2), {
      flag: 'wx',
      mode: 0o600,
    });
    deliveryFileCreated = true;
    console.log('[Delivery Staging] Credential file staged successfully with exclusive creation (wx).');

    // Step D: Commit transaction with ambiguous commit tracking
    console.log('[Transaction] Issuing COMMIT...');
    commitAttempted = true;

    try {
      if (testHooks.failCommitWithNetworkDrop) {
        throw testHooks.failCommitWithNetworkDrop;
      }
      await client.query('COMMIT');
      transactionActive = false;
      commitConfirmed = true;
      console.log('[Transaction] Transaction successfully committed.');
    } catch (commitErr) {
      console.log('\n[Ambiguous Commit Detected]');
      console.log('  Reason: Error occurred during or immediately after issuing COMMIT.');
      console.log('  Connection may have dropped while PostgreSQL processed COMMIT.');
      console.log('  Preserving staged credential file at:', deliveryFilePath);
      console.log('  Initiating secondary verification connection to resolve database state...');

      // Close the suspect client safely
      if (client) {
        try {
          client.release(true);
          client = null;
        } catch (_e) {}
      }

      // Execute Ambiguous COMMIT Resolver with exact created ID verification and delayed polling
      const resolution = await resolveAmbiguousCommit({
        getClient,
        targetAccounts: accounts,
        createdUserRecords,
        originalError: commitErr,
        testHooks,
      });

      if (resolution.status === 'CONFIRMED_COMMITTED') {
        // Outcome B: Confirmed committed with exact matching IDs
        console.log('[Ambiguity Resolved] Both accounts exist with exact matching IDs and roles. COMMIT DID SUCCEED.');
        console.log('[Ambiguity Resolved] Preserving credential file. Resolving state to COMMITTED.');
        commitConfirmed = true;
        transactionActive = false;
      } else if (resolution.status === 'CONFIRMED_ABORTED') {
        // Outcome C: Genuinely confirmed aborted by explicit database abort code
        console.log('[Ambiguity Resolved] Definitive database abort confirmed.');
        console.log(`  Detail: ${resolution.reason}`);
        transactionActive = false;
        commitConfirmed = false;
        safeCleanupDeliveryFile();
        const cleanAbortErr = new Error(`COMMIT query failed with confirmed database abort: ${commitErr.message}`);
        cleanAbortErr.outcome = PROVISIONING_OUTCOMES.CONFIRMED_ABORTED;
        cleanAbortErr.originalError = commitErr;
        throw cleanAbortErr;
      } else {
        // Outcome D: Ambiguous / Unresolved outcome (network drop with 0 rows, IDs differ, or resolver query error)
        console.error('[Ambiguity Critical] Outcome remains uncertain. Preserving credential file for manual review.');
        console.error(`  Reason: ${resolution.reason}`);
        console.error('  Safety Action: DO NOT execute compensating deletion. Preserve credentials.');
        transactionActive = false;
        const unresErr = new Error(`Ambiguous commit outcome: ${resolution.reason} (Original error: ${commitErr.message})`);
        unresErr.outcome = PROVISIONING_OUTCOMES.AMBIGUOUS_UNRESOLVED;
        unresErr.deliveryFilePath = deliveryFilePath;
        unresErr.originalError = commitErr;
        throw unresErr;
      }
    }

    // Step E: Post-commit verification (Executes ONLY when commit is confirmed!)
    console.log('\n[Verification] Validating accounts via repository and authService...');
    try {
      if (testHooks.failPostCommitVerification) {
        throw testHooks.failPostCommitVerification;
      }

      for (const acc of accounts) {
        // 1. Verify existence in DB via userRepository
        const dbUser = await userRepository.findByEmail(acc.email);
        if (!dbUser) {
          throw new Error(`Post-commit verification failed: ${acc.email} could not be retrieved from database.`);
        }
        if (dbUser.role !== acc.role) {
          throw new Error(`Post-commit verification failed: ${acc.email} has unexpected role "${dbUser.role}".`);
        }

        // 2. Verify authentication and token issuance via authService.login
        const authResult = await authService.login({
          email: acc.email,
          password: acc.password,
        });

        if (!authResult || !authResult.token || !authResult.user) {
          throw new Error(`Post-commit verification failed: ${acc.email} failed authentication.`);
        }
        if (authResult.user.role !== acc.role) {
          throw new Error(`Post-commit verification failed: ${acc.email} issued token has wrong role.`);
        }

        console.log(`[Verification PASS] ${acc.email}: Profile verified & JWT issued | Role: ${authResult.user.role}`);
      }
    } catch (verifErr) {
      // Distinguish transient infrastructure errors from definitive verification failures
      if (isTransientOrInfrastructureError(verifErr)) {
        console.error('\n[Transient Verification Failure]');
        console.error('  Verification could not complete due to transient/infrastructure error:', verifErr.message);
        console.error('  Safety Action: Preserving credentials. DO NOT execute compensating deletion.');
        const transientErr = new Error(`Post-commit verification encountered transient network/infrastructure error: ${verifErr.message}`);
        transientErr.outcome = PROVISIONING_OUTCOMES.TRANSIENT_VERIFICATION_FAILURE;
        transientErr.deliveryFilePath = deliveryFilePath;
        transientErr.originalError = verifErr;
        throw transientErr;
      }

      // Definitive verification failure:
      console.error('\n[Compensating Rollback] Post-commit verification definitively failed.');
      console.error('  Removing ONLY the exact user records created in this execution...');
      let compClient = null;
      let deletionFullyVerified = false;
      try {
        if (testHooks.failCompensatingDeletion) {
          throw testHooks.failCompensatingDeletion;
        }

        compClient = await getClient();
        const createdIds = createdUserRecords.map((u) => u.id);
        const delRes = await compClient.query(
          'DELETE FROM users WHERE id = ANY($1::uuid[]) RETURNING id, email;',
          [createdIds]
        );

        const deletedRows = delRes.rows || [];
        const deletedIds = new Set(deletedRows.map((r) => r.id));

        // Verify that every expected ID was actually deleted
        const allExpectedDeleted =
          createdIds.length > 0 &&
          deletedIds.size === createdIds.length &&
          createdIds.every((id) => deletedIds.has(id));

        if (allExpectedDeleted) {
          deletionFullyVerified = true;
          console.log(`[Compensating Rollback] Cleaned up all ${deletedRows.length} record(s):`);
          deletedRows.forEach((r) => console.log(`  - Removed: ${r.email} (${r.id})`));
        } else {
          console.error(
            `[Compensating Rollback Incomplete] Expected ${createdIds.length} records deleted, but database reported ${deletedRows.length}.`
          );
        }
      } catch (compErr) {
        console.error('[Compensating Rollback Error] Failed to execute compensating deletion:', compErr.message);
      } finally {
        if (compClient) {
          try { compClient.release(); } catch (_e) {}
        }
      }

      // ONLY delete the credential file AFTER successful, positively verified cleanup
      if (deletionFullyVerified) {
        safeCleanupDeliveryFile();
      } else {
        console.error('[Safety Action] Compensating deletion was incomplete or failed. PRESERVING staged credential file at:', deliveryFilePath);
      }

      verifErr.outcome = PROVISIONING_OUTCOMES.POST_COMMIT_VERIFICATION_FAILURE;
      verifErr.deletionFullyVerified = deletionFullyVerified;
      verifErr.deliveryFilePath = deliveryFilePath;
      throw verifErr;
    }

    // Success Outcome (Outcome B or normal clean commit)
    console.log('\n=== Provisioning Completed Successfully ===');
    console.log('[Status] 2 accounts created and verified in Supabase.');
    console.log('[Delivery File] Credential file staged at:', deliveryFilePath);
    console.log('[Notice] Passwords were NOT printed to logs. Use the one-time retrieval procedure to extract.');

    return {
      success: true,
      outcome: PROVISIONING_OUTCOMES.CONFIRMED_COMMITTED_SUCCESS,
      deliveryFilePath,
      provisionedCount: createdUserRecords.length,
      createdIds: createdUserRecords.map((u) => u.id),
    };

  } catch (err) {
    console.error('\n[OUTCOME CLASSIFICATION]', err.outcome || 'UNCLASSIFIED_ERROR');
    console.error('  Message:', err.message);

    // Outcome A: Pre-commit failure (before commitAttempted)
    if (transactionActive && client && !commitAttempted) {
      console.log('[Rollback] Failure occurred before COMMIT. Executing ROLLBACK...');
      try {
        await client.query('ROLLBACK');
        console.log('[Rollback] In-flight transaction successfully rolled back.');
      } catch (rbErr) {
        console.error('[Rollback Error] Failed to rollback transaction:', rbErr.message);
      }
      if (deliveryFileCreated) {
        safeCleanupDeliveryFile();
      }
      err.outcome = PROVISIONING_OUTCOMES.PRE_COMMIT_FAILURE;
    }

    throw err;
  } finally {
    if (client) {
      try {
        client.release();
      } catch (_e) {}
    }
    try {
      await closePool();
    } catch (_e) {}
  }
}

// Entrypoint
if (require.main === module) {
  loadAndValidateProductionEnvironment();
  provisionProductionUsers()
    .then(() => {
      process.exit(0);
    })
    .catch(() => {
      process.exit(1);
    });
}

module.exports = {
  EXPECTED_PROJECT_REF,
  EXPECTED_POOLER_HOSTNAME,
  EXPECTED_ACCOUNTS,
  PROVISIONING_OUTCOMES,
  isTransientOrInfrastructureError,
  isDefinitivePostgresAbortError,
  validateDatabaseUrl,
  validateSupabaseUrl,
  loadAndValidateProductionEnvironment,
  generateSecurePassword,
  resolveAmbiguousCommit,
  provisionProductionUsers,
};
