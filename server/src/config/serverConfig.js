module.exports = {
  port: process.env.PORT || 3000,
  
  websocket: {
    pingTimeout: 60000,
    pingInterval: 25000,
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      credentials: true
    }
  },
  
  healthCheck: {
    interval: 5000,        // Check every 5 seconds
    timeout: 2000,         // Response must come within 2s
    unhealthyThreshold: 3  // Mark unhealthy after 3 failures
  }
};