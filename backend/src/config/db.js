const { Pool } = require('pg');
const config = require('./index');

let pool = null;

/**
 * Returns the active pg.Pool instance, initializing it if necessary.
 */
const getPool = () => {
  if (!pool) {
    pool = new Pool({
      connectionString: config.db.connectionString,
      max: config.db.max,
      idleTimeoutMillis: config.db.idleTimeoutMillis,
      connectionTimeoutMillis: config.db.connectionTimeoutMillis,
    });

    pool.on('error', (err) => {
      if (!config.isTest) {
        console.error('[Database Pool Error] Unexpected idle client error:', err.message);
      }
    });
  }

  return pool;
};

/**
 * Executes a parameterized SQL query on the pool.
 * @param {string} text - SQL query string
 * @param {Array} [params] - Query parameters
 * @returns {Promise<import('pg').QueryResult>}
 */
const query = (text, params = []) => {
  return getPool().query(text, params);
};

/**
 * Checks out a client from the pool for transactions.
 * @returns {Promise<import('pg').PoolClient>}
 */
const getClient = () => {
  return getPool().connect();
};

/**
 * Executes a function within a managed database transaction.
 * Automatically handles BEGIN, COMMIT, and ROLLBACK.
 * @param {Function} callback - Async function receiving the transactional client
 * @returns {Promise<*>} Result of the callback
 */
const withTransaction = async (callback) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Tests database connectivity by executing a simple query.
 * @returns {Promise<{connected: boolean, error?: string, version?: string}>}
 */
const testConnection = async () => {
  try {
    const res = await query('SELECT 1 AS connected, version() AS version;');
    return {
      connected: true,
      version: res.rows[0].version,
    };
  } catch (error) {
    return {
      connected: false,
      error: error.message,
    };
  }
};

/**
 * Closes the connection pool gracefully.
 * @returns {Promise<void>}
 */
const closePool = async () => {
  if (pool) {
    await pool.end();
    pool = null;
  }
};

module.exports = {
  getPool,
  query,
  getClient,
  withTransaction,
  testConnection,
  closePool,
};
