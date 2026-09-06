const express = require('express');
const cors = require('cors');
const config = require('./config');
const apiRoutes = require('./routes');
const notFoundHandler = require('./middleware/notFound.middleware');
const errorHandler = require('./middleware/error.middleware');
const { sendSuccess } = require('./utils/apiResponse');

const app = express();

// Standard middleware
app.use(cors(config.cors));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

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
