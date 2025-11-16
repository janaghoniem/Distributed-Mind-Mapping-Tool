// server/src/routes/healthRoutes.js
// HTTP endpoint that uses your HealthMonitor service

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

// Import your HealthMonitor instance (we'll export it from server.js)
let healthMonitor = null;

// Allow setting the monitor instance
router.setHealthMonitor = (monitor) => {
  healthMonitor = monitor;
};

router.get('/', (req, res) => {
  // Basic health data
  const health = {
    status: 'ok',
    timestamp: new Date(),
    uptime: process.uptime(),
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    memory: {
      heapUsed: `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`,
      heapTotal: `${(process.memoryUsage().heapTotal / 1024 / 1024).toFixed(2)} MB`,
      rss: `${(process.memoryUsage().rss / 1024 / 1024).toFixed(2)} MB`
    },
    environment: process.env.NODE_ENV || 'development'
  };

  // Add HealthMonitor status if available
  if (healthMonitor) {
    const monitorStatus = healthMonitor.getStatus();
    health.monitor = {
      healthy: monitorStatus.healthy,
      isPrimary: monitorStatus.isPrimary,
      failureCount: monitorStatus.failureCount,
      lastCheck: monitorStatus.timestamp
    };
    
    // Override status based on monitor
    if (!monitorStatus.healthy) {
      health.status = 'unhealthy';
    }
  }

  // Return 503 if unhealthy or database disconnected
  const isUnhealthy = health.status !== 'ok' || health.database === 'disconnected';
  const statusCode = isUnhealthy ? 503 : 200;

  res.status(statusCode).json(health);
});

// Detailed health check endpoint
router.get('/detailed', async (req, res) => {
  const detailed = {
    server: {
      status: 'ok',
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      nodeVersion: process.version,
      platform: process.platform,
      pid: process.pid
    },
    database: {
      connected: mongoose.connection.readyState === 1,
      state: getConnectionStateName(mongoose.connection.readyState),
      host: mongoose.connection.host || 'unknown',
      name: mongoose.connection.name || 'unknown'
    },
    memory: process.memoryUsage(),
    monitor: null,
    timestamp: new Date()
  };

  // Add monitor status
  if (healthMonitor) {
    detailed.monitor = healthMonitor.getStatus();
  }

  // Try database ping
  try {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.db.admin().ping();
      detailed.database.pingSuccess = true;
    }
  } catch (error) {
    detailed.database.pingSuccess = false;
    detailed.database.pingError = error.message;
  }

  const isHealthy = detailed.database.connected && 
                    (!healthMonitor || healthMonitor.getStatus().healthy);
  
  res.status(isHealthy ? 200 : 503).json(detailed);
});

// Helper function
function getConnectionStateName(state) {
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
    99: 'uninitialized'
  };
  return states[state] || 'unknown';
}

module.exports = router;