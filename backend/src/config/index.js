const dotenv = require('dotenv');

// Load environment variables from .env if present
dotenv.config();

const config = {
  env: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test',
  port: parseInt(process.env.PORT || '5000', 10),
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
  },
  api: {
    prefix: '/api/v1',
  },
};

module.exports = config;
