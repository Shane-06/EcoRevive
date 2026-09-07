const config = require('../config');
const { testConnection } = require('../config/db');
const { sendSuccess } = require('../utils/apiResponse');

/**
 * Health check controller providing operational status of the EcoRevive backend.
 */
const getHealthStatus = async (req, res) => {
  let dbStatus = 'untested';
  try {
    const dbCheck = await testConnection();
    dbStatus = dbCheck.connected ? 'connected' : 'disconnected';
  } catch (_e) {
    dbStatus = 'disconnected';
  }

  const healthData = {
    status: 'operational',
    service: 'ecorevive-backend',
    version: '1.0.0',
    environment: config.env,
    database: dbStatus,
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  };

  return sendSuccess(res, healthData, 200);
};

module.exports = {
  getHealthStatus,
};
