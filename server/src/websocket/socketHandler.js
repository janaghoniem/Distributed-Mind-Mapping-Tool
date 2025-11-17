// server/src/websocket/socketHandler.js
const Node = require('../models/Node');
const Edge = require('../models/Edge');
const Map = require('../models/Map');
const logger = require('../utils/logger');

let io;
let activeConnectionsMap = new Map();  // ← Changed const to let

const DEFAULT_MAP_ID = 'default_map';

function setupWebSocket(server) {
  const { Server } = require('socket.io');
  
  io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      credentials: true,
      methods: ['GET', 'POST']
    },
    pingTimeout: 60000,
    pingInterval: 25000
  });

  // Reset the connections map on server restart
  activeConnectionsMap = new Map();

  ensureDefaultMap();

  io.on('connection', (socket) => {
    const userId = socket.handshake.query.userId || socket.id;
    logger.info(`✅ Client connected: ${socket.id} (User: ${userId})`);
    
    activeConnectionsMap.set(socket.id, {
      socketId: socket.id,
      userId,
      connectedAt: new Date(),
      mapId: DEFAULT_MAP_ID
    });

    // SYNC REQUEST
    socket.on('sync:request', async (data) => {
      try {
        const mapId = data?.mapId || DEFAULT_MAP_ID;
        logger.info(`📥 Sync request from ${socket.id} for map: ${mapId}`);
        
        const nodes = await Node.find({ mapId, isDeleted: false }).lean();
        const edges = await Edge.find({ mapId, isDeleted: false }).lean();
        
        const frontendNodes = nodes.map(n => ({
          id: n.nodeId,
          label: n.content || 'Node',
          position: n.position,
          color: n.style?.color || '#3b82f6',
          shape: n.style?.shape || 'circle'
        }));
        
        const frontendEdges = edges.map(e => ({
          id: e.edgeId,
          source: e.from,
          target: e.to
        }));

        socket.emit('sync:response', { 
          nodes: frontendNodes, 
          edges: frontendEdges 
        });
        
        logger.info(`📤 Sent sync data: ${frontendNodes.length} nodes, ${frontendEdges.length} edges`);
      } catch (error) {
        logger.error('❌ Sync error:', error);
        socket.emit('sync:error', { error: error.message });
      }
    });

    // NODE:ADD
    socket.on('node:add', async (data) => {
      try {
        const { node, userId: senderId } = data;
        logger.info(`📥 node:add from ${senderId}:`, node.label);
        
        const newNode = new Node({
          nodeId: node.id,
          mapId: DEFAULT_MAP_ID,
          content: node.label,
          position: node.position,
          style: {
            color: node.color,
            shape: node.shape || 'circle'
          },
          isDeleted: false
        });
        
        await newNode.save();
        logger.info(`💾 Saved node to DB: ${node.id}`);
        
        socket.broadcast.emit('node:add', {
          node,
          userId: senderId
        });
        
      } catch (error) {
        logger.error('❌ Error in node:add:', error);
        socket.emit('error', { message: error.message });
      }
    });

    // NODE:REMOVE
    socket.on('node:remove', async (data) => {
      try {
        const { nodeId, userId: senderId } = data;
        logger.info(`📥 node:remove from ${senderId}:`, nodeId);
        
        await Node.updateOne(
          { nodeId, mapId: DEFAULT_MAP_ID },
          { $set: { isDeleted: true, updatedAt: new Date() } }
        );
        
        await Edge.updateMany(
          { 
            mapId: DEFAULT_MAP_ID,
            $or: [{ from: nodeId }, { to: nodeId }]
          },
          { $set: { isDeleted: true, updatedAt: new Date() } }
        );
        
        logger.info(`💾 Deleted node from DB: ${nodeId}`);
        
        socket.broadcast.emit('node:remove', {
          nodeId,
          userId: senderId
        });
        
      } catch (error) {
        logger.error('❌ Error in node:remove:', error);
        socket.emit('error', { message: error.message });
      }
    });

    // NODE:UPDATE
    socket.on('node:update', async (data) => {
      try {
        const { nodeId, updates, userId: senderId } = data;
        logger.info(`📥 node:update from ${senderId}:`, nodeId, updates);
        
        const dbUpdates = {};
        if (updates.label !== undefined) dbUpdates.content = updates.label;
        if (updates.color !== undefined) dbUpdates['style.color'] = updates.color;
        if (updates.shape !== undefined) dbUpdates['style.shape'] = updates.shape;
        dbUpdates.updatedAt = new Date();
        
        await Node.updateOne(
          { nodeId, mapId: DEFAULT_MAP_ID },
          { $set: dbUpdates }
        );
        
        logger.info(`💾 Updated node in DB: ${nodeId}`);
        
        socket.broadcast.emit('node:update', {
          nodeId,
          updates,
          userId: senderId
        });
        
      } catch (error) {
        logger.error('❌ Error in node:update:', error);
        socket.emit('error', { message: error.message });
      }
    });

    // NODE:MOVE
    socket.on('node:move', async (data) => {
      try {
        const { nodeId, position, userId: senderId } = data;
        
        await Node.updateOne(
          { nodeId, mapId: DEFAULT_MAP_ID },
          { $set: { position, updatedAt: new Date() } }
        );
        
        socket.broadcast.emit('node:move', {
          nodeId,
          position,
          userId: senderId
        });
        
      } catch (error) {
        logger.error('❌ Error in node:move:', error);
      }
    });

    // EDGE:ADD
    socket.on('edge:add', async (data) => {
      try {
        const { source, target, userId: senderId } = data;
        logger.info(`📥 edge:add from ${senderId}: ${source} -> ${target}`);
        
        const sourceNode = await Node.findOne({ nodeId: source, mapId: DEFAULT_MAP_ID, isDeleted: false });
        const targetNode = await Node.findOne({ nodeId: target, mapId: DEFAULT_MAP_ID, isDeleted: false });
        
        if (!sourceNode || !targetNode) {
          logger.warn('⚠️ Cannot create edge: node not found');
          socket.emit('error', { message: 'Cannot create edge: node not found' });
          return;
        }
        
        const edgeId = `edge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const newEdge = new Edge({
          edgeId,
          mapId: DEFAULT_MAP_ID,
          from: source,
          to: target,
          isDeleted: false
        });
        
        await newEdge.save();
        logger.info(`💾 Saved edge to DB: ${edgeId}`);
        
        socket.broadcast.emit('edge:add', {
          edge: {
            id: edgeId,
            source,
            target
          },
          source,
          target,
          userId: senderId
        });
        
      } catch (error) {
        logger.error('❌ Error in edge:add:', error);
        logger.error('Error details:', error.message);
        socket.emit('error', { message: error.message });
      }
    });

    // EDGE:REMOVE
    socket.on('edge:remove', async (data) => {
      try {
        const { edgeId, userId: senderId } = data;
        logger.info(`📥 edge:remove from ${senderId}:`, edgeId);
        
        await Edge.updateOne(
          { edgeId, mapId: DEFAULT_MAP_ID },
          { $set: { isDeleted: true, updatedAt: new Date() } }
        );
        
        logger.info(`💾 Deleted edge from DB: ${edgeId}`);
        
        socket.broadcast.emit('edge:remove', {
          edgeId,
          userId: senderId
        });
        
      } catch (error) {
        logger.error('❌ Error in edge:remove:', error);
        socket.emit('error', { message: error.message });
      }
    });

    // CURSOR:UPDATE
    socket.on('cursor:update', (data) => {
      socket.broadcast.emit('cursor:update', {
        userId: data.userId,
        position: data.position,
        color: data.color
      });
    });

    // JOIN/LEAVE MAP
    socket.on('join-map', ({ mapId }) => {
      socket.join(`map:${mapId}`);
      socket.mapId = mapId;
      
      const connection = activeConnectionsMap.get(socket.id);
      if (connection) {
        connection.mapId = mapId;
      }
      
      logger.info(`📍 Client ${socket.id} joined map: ${mapId}`);
      socket.emit('joined-map', { mapId });
    });

    socket.on('leave-map', ({ mapId }) => {
      socket.leave(`map:${mapId}`);
      logger.info(`👋 Client ${socket.id} left map: ${mapId}`);
    });

    // DISCONNECT - FIX WITH SAFETY CHECK
    socket.on('disconnect', () => {
      logger.info(`❌ Client disconnected: ${socket.id} (User: ${userId})`);
      
      try {
        socket.broadcast.emit('user:left', { userId });
        
        // Safety check
        if (activeConnectionsMap && typeof activeConnectionsMap.delete === 'function') {
          activeConnectionsMap.delete(socket.id);
          logger.info(`🧹 Cleaned up connection: ${socket.id}`);
        } else {
          logger.error('⚠️ activeConnectionsMap is not a Map! Type:', typeof activeConnectionsMap);
        }
      } catch (error) {
        logger.error('❌ Error during disconnect:', error);
      }
    });
  });

  logger.info('✅ WebSocket server initialized');
  return io;
}

// Create default map
async function ensureDefaultMap() {
  try {
    const exists = await Map.findOne({ mapId: DEFAULT_MAP_ID });
    if (!exists) {
      const defaultMap = new Map({
        mapId: DEFAULT_MAP_ID,
        title: 'Default Map',
        description: 'Automatically created default map',
        ownerId: 'system',
        isDeleted: false
      });
      await defaultMap.save();
      logger.info('✅ Created default map');
    }
  } catch (error) {
    logger.error('❌ Error creating default map:', error.message);
  }
}

const getIO = () => {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
};

const getActiveConnections = () => activeConnectionsMap;

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