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
  jwt: {
    secret: process.env.JWT_SECRET || 'development_jwt_secret_key_change_in_production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  providers: {
    openMeteo: {
      baseUrl: process.env.OPEN_METEO_BASE_URL || 'https://api.open-meteo.com/v1/forecast',
      timeoutMs: parseInt(process.env.PROVIDER_TIMEOUT_MS || '5000', 10),
    },
    soilGrids: {
      baseUrl: process.env.SOILGRIDS_BASE_URL || 'https://rest.isric.org/soilgrids/v2.0/properties/query',
      timeoutMs: parseInt(process.env.PROVIDER_TIMEOUT_MS || '5000', 10),
    },
  },
};

module.exports = config;
