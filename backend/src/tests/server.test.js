const request = require('supertest');
const { app } = require('../server');

describe('Milestone 1 — Server & Project Architecture', () => {
  it('GET / responds with operational status and M1 confirmation', async () => {
    const res = await request(app).get('/');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('status', 'operational');
    expect(res.body).toHaveProperty('message');
    expect(res.body.message).toContain('Milestone 1');
  });
});
