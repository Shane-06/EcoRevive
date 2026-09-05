const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Root placeholder endpoint for Milestone 1
app.get('/', (req, res) => {
  res.json({
    message: 'EcoRevive Backend Server Initialized (Milestone 1 — Repository & Project Architecture)',
    status: 'operational',
    timestamp: new Date().toISOString()
  });
});

let server;
if (process.env.NODE_ENV !== 'test') {
  server = app.listen(PORT, () => {
    console.log(`[EcoRevive M1] Server running on port ${PORT}`);
  });
}

module.exports = { app, server };
