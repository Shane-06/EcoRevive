const config = require('../config');
const { sendSuccess } = require('../utils/apiResponse');

/**
 * Health check controller providing operational status of the EcoRevive backend.
 */
const getHealthStatus = (req, res) => {
  const healthData = {
    status: 'operational',
    service: 'ecorevive-backend',
    version: '1.0.0',
    environment: config.env,
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  };

  return sendSuccess(res, healthData, 200);
};

module.exports = {
  getHealthStatus,
};
