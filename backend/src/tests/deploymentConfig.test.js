const config = require('../config');
const { buildTreeProfileUrl } = require('../utils/qr');
const app = require('../app');

describe('Pre-Deployment Configuration & Security Fixes', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe('1. PostgreSQL SSL Configuration (resolveDbSslConfig)', () => {
    it('SSL-01: Returns false by default for local development without SSL', () => {
      delete process.env.DB_SSL;
      delete process.env.DB_SSL_REJECT_UNAUTHORIZED;
      delete process.env.DB_SSL_CA;
      process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/ecorevive';
      process.env.NODE_ENV = 'development';

      const ssl = config.resolveDbSslConfig();
      expect(ssl).toBe(false);
    });

    it('SSL-02: Returns secure SSL config with rejectUnauthorized: true when DB_SSL=true', () => {
      process.env.DB_SSL = 'true';
      delete process.env.DB_SSL_REJECT_UNAUTHORIZED;
      delete process.env.DB_SSL_CA;

      const ssl = config.resolveDbSslConfig();
      expect(ssl).toEqual({ rejectUnauthorized: true });
    });

    it('SSL-03: Auto-detects sslmode=require in DATABASE_URL with rejectUnauthorized: true', () => {
      delete process.env.DB_SSL;
      process.env.DATABASE_URL = 'postgresql://user:pass@ep-xyz.neon.tech/neondb?sslmode=require';
      delete process.env.DB_SSL_REJECT_UNAUTHORIZED;
      delete process.env.DB_SSL_CA;

      const ssl = config.resolveDbSslConfig();
      expect(ssl).toEqual({ rejectUnauthorized: true });
    });

    it('SSL-04: Never disables certificate verification globally; allows explicit opt-out only via DB_SSL_REJECT_UNAUTHORIZED=false', () => {
      process.env.DB_SSL = 'true';
      process.env.DB_SSL_REJECT_UNAUTHORIZED = 'false';
      delete process.env.DB_SSL_CA;

      const ssl = config.resolveDbSslConfig();
      expect(ssl).toEqual({ rejectUnauthorized: false });
    });

    it('SSL-05: Supports custom CA certificate via DB_SSL_CA', () => {
      process.env.DB_SSL = 'true';
      process.env.DB_SSL_CA = '-----BEGIN CERTIFICATE-----\nFAKE_CA_BUNDLE\n-----END CERTIFICATE-----';

      const ssl = config.resolveDbSslConfig();
      expect(ssl).toMatchObject({
        rejectUnauthorized: true,
        ca: '-----BEGIN CERTIFICATE-----\nFAKE_CA_BUNDLE\n-----END CERTIFICATE-----',
      });
    });

    it('SSL-06: Disables SSL when DB_SSL=false even if DATABASE_URL contains sslmode', () => {
      process.env.DB_SSL = 'false';
      process.env.DATABASE_URL = 'postgresql://user:pass@ep-xyz.neon.tech/neondb?sslmode=require';

      const ssl = config.resolveDbSslConfig();
      expect(ssl).toBe(false);
    });
  });

  describe('2. Express Trusted-Proxy Configuration (resolveTrustProxyConfig)', () => {
    it('PROXY-01: Returns false by default when TRUST_PROXY is unset or false', () => {
      delete process.env.TRUST_PROXY;
      expect(config.resolveTrustProxyConfig()).toBe(false);

      process.env.TRUST_PROXY = 'false';
      expect(config.resolveTrustProxyConfig()).toBe(false);
    });

    it('PROXY-02: Returns numeric hop count when TRUST_PROXY is an integer string', () => {
      process.env.TRUST_PROXY = '1';
      expect(config.resolveTrustProxyConfig()).toBe(1);

      process.env.TRUST_PROXY = '2';
      expect(config.resolveTrustProxyConfig()).toBe(2);
    });

    it('PROXY-03: Maps TRUST_PROXY=true to safe 1-hop default rather than blind unconstrained trust', () => {
      process.env.TRUST_PROXY = 'true';
      expect(config.resolveTrustProxyConfig()).toBe(1);
    });

    it('PROXY-04: Returns named subnet or specific IP string', () => {
      process.env.TRUST_PROXY = 'loopback';
      expect(config.resolveTrustProxyConfig()).toBe('loopback');

      process.env.TRUST_PROXY = '10.0.0.0/8';
      expect(config.resolveTrustProxyConfig()).toBe('10.0.0.0/8');
    });

    it('PROXY-05: Parses comma-separated list of trusted proxy IPs/subnets', () => {
      process.env.TRUST_PROXY = '10.0.0.1, 10.0.0.2, loopback';
      expect(config.resolveTrustProxyConfig()).toEqual(['10.0.0.1', '10.0.0.2', 'loopback']);
    });
  });

  describe('3. Production APP_URL & Canonical QR URL Generation', () => {
    it('URL-01: buildTreeProfileUrl constructs canonical profile URL using configured APP_URL', () => {
      const originalAppUrl = config.appUrl;
      try {
        config.appUrl = 'https://ecorevive.vercel.app';
        const url = buildTreeProfileUrl('ER-PLT-00042');
        expect(url).toBe('https://ecorevive.vercel.app/tree/ER-PLT-00042');
      } finally {
        config.appUrl = originalAppUrl;
      }
    });

    it('URL-02: buildTreeProfileUrl cleanly strips any trailing slashes from APP_URL', () => {
      const originalAppUrl = config.appUrl;
      try {
        config.appUrl = 'https://ecorevive.vercel.app///';
        const url = buildTreeProfileUrl('ER-PLT-00001');
        expect(url).toBe('https://ecorevive.vercel.app/tree/ER-PLT-00001');
      } finally {
        config.appUrl = originalAppUrl;
      }
    });
  });

  describe('4. Static Uploads Serving & Express Architecture', () => {
    it('STATIC-01: Express app is configured and exports functional router', () => {
      expect(app).toBeDefined();
      expect(typeof app.use).toBe('function');
    });
  });
});

