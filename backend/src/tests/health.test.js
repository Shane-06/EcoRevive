const request = require('supertest');
const app = require('../app');

describe('Milestone 2 — Health & Root Endpoints', () => {
  describe('GET /', () => {
    it('should return 200 with root discovery payload', async () => {
      const res = await request(app).get('/');
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body.data).toHaveProperty('service', 'EcoRevive REST API');
      expect(res.body.data).toHaveProperty('status', 'operational');
      expect(res.body.data).toHaveProperty('endpoints');
      expect(res.body.data.endpoints.health).toBe('/api/health');
    });
  });

  describe('GET /api/health', () => {
    it('should return 200 with operational health status and standard envelope', async () => {
      const res = await request(app).get('/api/health');
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body.data).toHaveProperty('status', 'operational');
      expect(res.body.data).toHaveProperty('service', 'ecorevive-backend');
      expect(res.body.data).toHaveProperty('version', '1.0.0');
      expect(res.body.data).toHaveProperty('timestamp');
      expect(res.body.data).toHaveProperty('uptime');
    });
  });

  describe('GET /api/v1/health', () => {
    it('should return 200 with operational health status under /api/v1 namespace', async () => {
      const res = await request(app).get('/api/v1/health');
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body.data).toHaveProperty('status', 'operational');
      expect(res.body.data).toHaveProperty('service', 'ecorevive-backend');
    });
  });
});
