const { app, startServer, stopServer } = require('../server');

describe('Milestone 2 — Server Lifecycle & Module Export', () => {
  it('should export app as an Express instance', () => {
    expect(app).toBeDefined();
    expect(typeof app.use).toBe('function');
    expect(typeof app.get).toBe('function');
  });

  it('should export startServer and stopServer lifecycle functions', () => {
    expect(typeof startServer).toBe('function');
    expect(typeof stopServer).toBe('function');
  });
});
