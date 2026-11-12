const dotenv = require('dotenv');

// Load environment variables from .env if present
dotenv.config();

/**
 * Resolves PostgreSQL SSL configuration securely.
 * Enforces certificate verification by default and supports provider-compatible options.
 * Does not disable certificate verification globally.
 */
function resolveDbSslConfig() {
  const dbUrl = process.env.DATABASE_URL || '';
  const isExplicitSslDisabled = process.env.DB_SSL === 'false' || process.env.DB_SSL === '0';
  if (isExplicitSslDisabled) {
    return false;
  }

  const isExplicitSslEnabled = process.env.DB_SSL === 'true' || process.env.DB_SSL === '1';
  const hasSslMode = dbUrl.includes('sslmode=') && !dbUrl.includes('sslmode=disable');
  const isProduction = process.env.NODE_ENV === 'production';
  const isRemoteHost = dbUrl && !dbUrl.includes('localhost') && !dbUrl.includes('127.0.0.1');

  // Activate SSL if explicitly enabled, or if sslmode is present, or in production with remote host
  if (isExplicitSslEnabled || hasSslMode || (isProduction && isRemoteHost)) {
    // Default rejectUnauthorized to true for security (certificate verification strictly enforced)
    const rejectUnauthorized = process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false';
    const sslConfig = { rejectUnauthorized };

    // Support custom CA certificate (as string or file path) if provided
    if (process.env.DB_SSL_CA) {
      try {
        const fs = require('fs');
        if (fs.existsSync(process.env.DB_SSL_CA)) {
          sslConfig.ca = fs.readFileSync(process.env.DB_SSL_CA, 'utf-8');
        } else {
          sslConfig.ca = process.env.DB_SSL_CA;
        }
      } catch (_err) {
        sslConfig.ca = process.env.DB_SSL_CA;
      }
    }

    return sslConfig;
  }

  return false;
}

/**
 * Resolves trusted proxy configuration for Express behind reverse proxies.
 * Never blindly trusts arbitrary forwarded headers (avoids setting 'trust proxy', true).
 * Supports:
 * - false: disabled (default)
 * - integer: number of trusted proxy hops (e.g. 1 for Render, Railway, Heroku)
 * - string: named subnet ('loopback', 'linklocal', 'uniquelocal') or specific IP/CIDR ('10.0.0.0/8')
 * - array: list of trusted IPs/subnets
 */
function resolveTrustProxyConfig() {
  const raw = process.env.TRUST_PROXY;
  if (!raw || raw.trim() === '' || raw.trim().toLowerCase() === 'false') {
    return false;
  }

  const trimmed = raw.trim();

  // If explicit numeric hop count (e.g. TRUST_PROXY=1)
  const num = parseInt(trimmed, 10);
  if (!isNaN(num) && num.toString() === trimmed && num >= 0) {
    return num;
  }

  // If set to 'true', enforce 1 hop (the immediate reverse proxy) rather than blind unconstrained trust
  if (trimmed.toLowerCase() === 'true') {
    return 1;
  }

  // If comma-separated list of subnets/IPs, return array
  if (trimmed.includes(',')) {
    return trimmed.split(',').map((s) => s.trim()).filter(Boolean);
  }

  // Otherwise return specific named subnet (e.g. 'loopback', 'linklocal') or IP
  return trimmed;
}

const config = {
  env: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test',
  port: parseInt(process.env.PORT || '5000', 10),
  appUrl: (process.env.APP_URL || process.env.PUBLIC_URL || 'http://localhost:5173').trim().replace(/\/+$/, ''),
  trustProxy: resolveTrustProxyConfig(),
  cors: {
    origin: process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.includes(',')
        ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim()).filter(Boolean)
        : process.env.CORS_ORIGIN.trim()
      : 'http://localhost:5173',
    credentials: true,
  },
  api: {
    prefix: '/api/v1',
  },
  db: {
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/ecorevive',
    max: parseInt(process.env.DB_POOL_MAX || (process.env.NODE_ENV === 'test' ? '5' : '10'), 10),
    idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000', 10),
    connectionTimeoutMillis: parseInt(process.env.DB_CONN_TIMEOUT || '5000', 10),
    ssl: resolveDbSslConfig(),
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'development_jwt_secret_key_change_in_production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  providers: {
    openMeteo: {
      baseUrl: process.env.OPEN_METEO_BASE_URL || 'https://api.open-meteo.com/v1/forecast',
      timeoutMs: parseInt(process.env.PROVIDER_TIMEOUT_MS || '5000', 10),
      freshTtlMs: parseInt(process.env.WEATHER_FRESH_TTL_MS || (30 * 60 * 1000).toString(), 10), // 30 mins
      maxStaleMs: parseInt(process.env.WEATHER_MAX_STALE_MS || (24 * 60 * 60 * 1000).toString(), 10), // 24 hours
    },
    soilGrids: {
      baseUrl: process.env.SOILGRIDS_BASE_URL || 'https://rest.isric.org/soilgrids/v2.0/properties/query',
      timeoutMs: parseInt(process.env.SOILGRIDS_TIMEOUT_MS || '25000', 10), // 25s bounded default
      ttlMs: parseInt(process.env.SOIL_TTL_MS || (90 * 24 * 60 * 60 * 1000).toString(), 10), // 90 days
      enableRegionalBaseline: process.env.SOILGRIDS_ENABLE_REGIONAL_BASELINE !== 'false',
      regionalDistanceKm: parseFloat(process.env.SOILGRIDS_REGIONAL_DISTANCE_KM || '10'),
    },
  },
  ai: {
    provider: process.env.AI_PROVIDER || 'mock',
    apiKey: process.env.GEMINI_API_KEY || '',
    timeoutMs: parseInt(process.env.AI_TIMEOUT_MS || '10000', 10),
    overallDeadlineMs: parseInt(process.env.AI_OVERALL_DEADLINE_MS || '25000', 10),
    primaryModel: 'gemini-3.8-flash',
    fallbackModel: 'gemini-3.5-flash-lite',
  },
  healthIntelligence: {
    monitoringIntervalDays: parseInt(process.env.HEALTH_MONITORING_INTERVAL_DAYS || '30', 10),
  },
  storage: {
    provider: (process.env.NODE_ENV === 'test'
      ? (process.env.TEST_STORAGE_PROVIDER || 'local')
      : (process.env.STORAGE_PROVIDER || 'local')
    ).trim().toLowerCase(),
    supabaseUrl: (process.env.SUPABASE_URL || '').trim().replace(/\/+$/, ''),
    supabaseServiceRoleKey: (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim(),
    bucket: (process.env.SUPABASE_STORAGE_BUCKET || 'ecorevive-evidence').trim(),
    signedUrlExpiresIn: parseInt(process.env.STORAGE_SIGNED_URL_EXPIRES_IN || '3600', 10),
  },
};

config.resolveDbSslConfig = resolveDbSslConfig;
config.resolveTrustProxyConfig = resolveTrustProxyConfig;

module.exports = config;
