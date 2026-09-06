const config = require('./config');
const app = require('./app');

let server = null;

const startServer = () => {
  server = app.listen(config.port, () => {
    console.log(`[EcoRevive API] Server listening on port ${config.port} in ${config.env} mode`);
    console.log(`[EcoRevive API] Health check available at http://localhost:${config.port}/api/health`);
  });

  return server;
};

const stopServer = (callback) => {
  if (server) {
    server.close(callback);
  } else if (callback) {
    callback();
  }
};

// Graceful shutdown signals
process.on('SIGTERM', () => {
  console.log('[EcoRevive API] SIGTERM received. Shutting down gracefully...');
  stopServer(() => {
    console.log('[EcoRevive API] Process terminated.');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('[EcoRevive API] SIGINT received. Shutting down gracefully...');
  stopServer(() => {
    console.log('[EcoRevive API] Process terminated.');
    process.exit(0);
  });
});

// Auto-start server if executed directly (not required by test suites)
if (require.main === module) {
  startServer();
}

module.exports = {
  app,
  server,
  startServer,
  stopServer,
};
