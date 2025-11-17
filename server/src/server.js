// require('dotenv').config();
// const express = require('express');
// const http = require('http');
// const { Server } = require('socket.io');
// const cors = require('cors');
// const graphRoutes = require('./routes/graphRoutes');

// const { connectDatabase, connectWithRetry } = require('./config/database');
// const HealthMonitor = require('./services/healthMonitor');


// const mapRoutes = require('./routes/mapRoutes');
// //const operationRoutes = require('./routes/operationRoutes');
// const healthRoutes = require('./routes/healthRoutes');
// const app = express();
// const server = http.createServer(app);


// //websocket
// //const setupWebSocket = require('./websocket/socketHandler');
// const { setupWebSocket } = require('./websocket/socketHandler');

// // Middleware
// app.use(cors());
// app.use(express.json());
// app.use('/api/graphs', graphRoutes);

// // Basic health check endpoint
// app.get('/health', (req, res) => {
//     res.json({
//         status: 'ok',
//         timestamp: new Date(),
//         message: 'Server is running - Architecture ready for implementation'
//     });
// });

// // WebSocket setup (placeholder for Point #3)
// const io = new Server(server, {
//     cors: {
//         origin: process.env.CLIENT_URL || 'http://localhost:5173',
//         credentials: true
//     }
// });
// setupWebSocket(io);

// io.on('connection', (socket) => {
//     console.log('Client connected:', socket.id);

//     // TODO Point #3: Implement WebSocket event handlers

//     socket.on('disconnect', () => {
//         console.log('Client disconnected:', socket.id);
//     });
// });

// // Instantiate and start health monitor as early as possible
// const healthMonitor = new HealthMonitor();
// healthMonitor.startMonitoring();

// // Disabled for now: connectWithRetry keeps retrying forever
// // Use blocking connectDatabase() instead - on failure, nodemon restarts on file change
// // const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/mindmap_db';
// // connectWithRetry(MONGODB_URI);

// const PORT = process.env.PORT || 3000;

// async function startServer() {
//     try {
//         // Connect to database (blocking - throws on failure)
//         // On auth error: fix .env and save → nodemon restarts → tries again
//         await connectDatabase();
//         console.log('Database connected');

//         // Start server
//         server.listen(PORT, () => {
//             console.log(`Server running on port ${PORT}`);
//         });
//     } catch (error) {
//         console.error('Failed to start server:', error);
//         process.exit(1);
//     }
// }

// startServer();

require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');

const { connectDatabase } = require('./config/database');
const HealthMonitor = require('./services/healthMonitor');
const { setupWebSocket } = require('./websocket/socketHandler');

// Import routes
const graphRoutes = require('./routes/graphRoutes');
const mapRoutes = require('./routes/mapRoutes');
const operationRoutes = require('./routes/operationRoutes');
const healthRoutes = require('./routes/healthRoutes');

const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());

// Routes
app.use('/api/graphs', graphRoutes);
app.use('/api/maps', mapRoutes);
app.use('/api/operations', operationRoutes);
app.use('/health', healthRoutes);

// Basic health check endpoint (simple version)
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date(),
    message: 'Server is running'
  });
});

// Setup WebSocket
const io = setupWebSocket(server);

// Start health monitor
const healthMonitor = new HealthMonitor();
healthMonitor.startMonitoring();

// Share health monitor with health routes
healthRoutes.setHealthMonitor(healthMonitor);

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    // Connect to database
    await connectDatabase();
    console.log('✅ Database connected');

    // Start server
    server.listen(PORT, () => {
      console.log('');
      console.log('═══════════════════════════════════════════');
      console.log('🚀 Mind Map Server Started Successfully');
      console.log('═══════════════════════════════════════════');
      console.log(`📍 Server:     http://localhost:${PORT}`);
      console.log(`📡 WebSocket:  ws://localhost:${PORT}`);
      console.log(`🏥 Health:     http://localhost:${PORT}/health`);
      console.log(`🌐 CORS:       ${process.env.CLIENT_URL || 'http://localhost:5173'}`);
      console.log(`🗄️  Database:   Connected`);
      console.log('═══════════════════════════════════════════');
      console.log('');
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  
  try {
    healthMonitor.stopMonitoring();
    io.close();
    server.close();
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
});