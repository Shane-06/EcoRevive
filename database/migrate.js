const fs = require('fs');
const path = require('path');
const { getClient, closePool } = require('../backend/src/config/db');

const formatError = (error) => {
  if (error.message) return error.message;
  if (error.errors && Array.isArray(error.errors)) {
    return error.errors.map((e) => e.message || e.code).join('; ');
  }
  return error.code || 'Could not connect to PostgreSQL database (Connection refused or timeout)';
};

/**
 * Executes database migrations in sequential order with version tracking.
 */
const runMigrations = async () => {
  let client;
  try {
    client = await getClient();
    console.log('[Migration Runner] Connected to PostgreSQL database.');

    // 1. Ensure schema_migrations table exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) NOT NULL UNIQUE,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Fetch applied migrations
    const { rows: appliedRows } = await client.query(
      'SELECT filename FROM schema_migrations ORDER BY id ASC;'
    );
    const appliedSet = new Set(appliedRows.map((r) => r.filename));

    // 3. Read migration files
    const migrationsDir = path.join(__dirname, 'migrations');
    const files = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    const pendingFiles = files.filter((f) => !appliedSet.has(f));

    if (pendingFiles.length === 0) {
      console.log('[Migration Runner] Database is up to date. No pending migrations.');
      return { total: files.length, applied: 0, pending: 0 };
    }

    console.log(`[Migration Runner] Found ${pendingFiles.length} pending migration(s):`);

    // 4. Apply each pending migration inside a transaction
    let appliedCount = 0;
    for (const filename of pendingFiles) {
      const filePath = path.join(migrationsDir, filename);
      const sqlContent = fs.readFileSync(filePath, 'utf-8');

      console.log(`  -> Applying: ${filename}...`);
      await client.query('BEGIN');
      try {
        await client.query(sqlContent);
        await client.query(
          'INSERT INTO schema_migrations (filename) VALUES ($1);',
          [filename]
        );
        await client.query('COMMIT');
        console.log(`     [SUCCESS] Applied ${filename}`);
        appliedCount++;
      } catch (migrationError) {
        await client.query('ROLLBACK');
        console.error(`     [FAILED] Migration ${filename} failed:`, formatError(migrationError));
        throw migrationError;
      }
    }

    console.log(`[Migration Runner] Successfully applied ${appliedCount} migration(s).`);
    return { total: files.length, applied: appliedCount, pending: 0 };
  } catch (error) {
    console.error('[Migration Runner Error] Migration execution failed:', formatError(error));
    throw error;
  } finally {
    if (client) {
      client.release();
    }
  }
};

if (require.main === module) {
  runMigrations()
    .then(async () => {
      await closePool();
      process.exit(0);
    })
    .catch(async () => {
      await closePool();
      process.exit(1);
    });
}

module.exports = {
  runMigrations,
};
