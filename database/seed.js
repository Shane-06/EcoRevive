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
 * Executes database seed scripts in sequential order.
 */
const runSeeds = async () => {
  let client;
  try {
    client = await getClient();
    console.log('[Seed Runner] Connected to PostgreSQL database.');

    const seedsDir = path.join(__dirname, 'seeds');
    const files = fs
      .readdirSync(seedsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    if (files.length === 0) {
      console.log('[Seed Runner] No seed files found.');
      return { total: 0, applied: 0 };
    }

    console.log(`[Seed Runner] Found ${files.length} seed file(s):`);

    let appliedCount = 0;
    for (const filename of files) {
      const filePath = path.join(seedsDir, filename);
      const sqlContent = fs.readFileSync(filePath, 'utf-8');

      console.log(`  -> Seeding: ${filename}...`);
      await client.query('BEGIN');
      try {
        await client.query(sqlContent);
        await client.query('COMMIT');
        console.log(`     [SUCCESS] Executed ${filename}`);
        appliedCount++;
      } catch (seedError) {
        await client.query('ROLLBACK');
        console.error(`     [FAILED] Seed ${filename} failed:`, formatError(seedError));
        throw seedError;
      }
    }

    console.log(`[Seed Runner] Successfully executed ${appliedCount} seed file(s).`);
    return { total: files.length, applied: appliedCount };
  } catch (error) {
    console.error('[Seed Runner Error] Seeding execution failed:', formatError(error));
    throw error;
  } finally {
    if (client) {
      client.release();
    }
  }
};

if (require.main === module) {
  runSeeds()
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
  runSeeds,
};
