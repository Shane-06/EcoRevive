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
  db: {
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/ecorevive',
    max: parseInt(process.env.DB_POOL_MAX || '20', 10),
    idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000', 10),
    connectionTimeoutMillis: parseInt(process.env.DB_CONN_TIMEOUT || '5000', 10),
  },
};

module.exports = config;
