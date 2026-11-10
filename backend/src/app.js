const express = require('express');
const path = require('path');
const cors = require('cors');
const config = require('./config');
const apiRoutes = require('./routes');
const notFoundHandler = require('./middleware/notFound.middleware');
const errorHandler = require('./middleware/error.middleware');
const { sendSuccess } = require('./utils/apiResponse');

const app = express();

// Configure trusted reverse proxy if explicitly enabled (never blindly trusts arbitrary headers)
if (config.trustProxy !== false) {
  app.set('trust proxy', config.trustProxy);
}

// Standard middleware
app.use(cors(config.cors));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve uploaded media statically if directory exists
const uploadDir = path.join(__dirname, '../uploads');
app.use('/uploads', express.static(uploadDir));

// Root welcome & discovery endpoint
app.get('/', (req, res) => {
  return sendSuccess(res, {
    service: 'EcoRevive REST API',
    version: '1.0.0',
    status: 'operational',
    documentation: '/docs',
    endpoints: {
      health: '/api/health',
      v1: '/api/v1',
    },
    timestamp: new Date().toISOString(),
  });
});

// Mount API router
app.use('/api', apiRoutes);

// Unhandled route 404 handler
app.use(notFoundHandler);

// Centralized error handler
app.use(errorHandler);

module.exports = app;
