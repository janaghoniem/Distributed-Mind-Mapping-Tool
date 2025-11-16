// server/src/websocket/socketHandler.js
// MIGRATED VERSION - Combines your existing logic with new architecture

const { Server } = require('socket.io');
const logger = require('../utils/logger');
//const connectionEvents = require('./events/connectionEvents');
//const syncEvents = require('./events/syncEvents');

// Import your existing services
const { applyVectorClock } = require('../services/vectorClock');
const merge = require('../services/merge');
const rollback = require('../services/rollback');

let io;
const activeConnections = new Map();

const setupWebSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      credentials: true,
      methods: ['GET', 'POST']
    },
    pingTimeout: 60000,
    pingInterval: 25000
  });

  io.on('connection', (socket) => {
    logger.info(`Client connected: ${socket.id}`);
    
    activeConnections.set(socket.id, {
      socketId: socket.id,
      connectedAt: new Date(),
      mapId: null,
      sessionId: null,
      clientId: null
    });

    // ==========================================
    // YOUR EXISTING LOGIC - editOperation
    // ==========================================
    socket.on('editOperation', async (op) => {
      try {
        logger.info(`Edit operation received from ${socket.id}: ${op.type}`);

        // 1. Attach vector clock
        op = applyVectorClock(op);

        // 2. Merge with existing state
        const merged = await merge(op);

        // 3. If invalid → rollback
        if (!merged.valid) {
          logger.warn(`Operation invalid, rolling back: ${merged.reason}`);
          socket.emit('rollback', rollback(op));
          return;
        }

        // 4. Broadcast to all clients in the map room
        if (socket.mapId) {
          socket.to(`map:${socket.mapId}`).emit('remoteUpdate', merged);
          logger.info(`Broadcasted update to map:${socket.mapId}`);
        } else {
          // Fallback to broadcast all if no room
          socket.broadcast.emit('remoteUpdate', merged);
        }

      } catch (error) {
        logger.error('WS error on editOperation:', error);
        socket.emit('error', {
          message: 'Failed to process operation',
          code: 'OPERATION_ERROR'
        });
      }
    });

    // ==========================================
    // NEW ARCHITECTURE - Connection Events
    // ==========================================
    connectionEvents.handleJoinMap(socket, io);
    connectionEvents.handleLeaveMap(socket, io);
    connectionEvents.handleDisconnect(socket, io, activeConnections);

    // ==========================================
    // NEW ARCHITECTURE - Sync Events
    // ==========================================
    syncEvents.handleRequestSync(socket, io);
    syncEvents.handleCursorMove(socket, io);
    syncEvents.handleHeartbeat(socket, io);

    // ==========================================
    // Disconnect Handler
    // ==========================================
    socket.on('disconnect', () => {
      logger.info(`Client disconnected: ${socket.id}`);
      activeConnections.delete(socket.id);
    });
  });

  logger.info('✓ WebSocket server initialized (migrated version)');
  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
};

const getActiveConnections = () => {
  return activeConnections;
};

const broadcastToMap = (mapId, event, data, excludeSocketId = null) => {
  if (!io) return;
  
  const room = `map:${mapId}`;
  
  if (excludeSocketId) {
    io.to(room).except(excludeSocketId).emit(event, data);
  } else {
    io.to(room).emit(event, data);
  }
};

module.exports = {
  setupWebSocket,
  getIO,
  getActiveConnections,
  broadcastToMap
};