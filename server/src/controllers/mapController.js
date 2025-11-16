// server/src/controllers/mapController.js
// REST API endpoints for map CRUD operations

const Map = require('../models/Map');
//const Node = require('../models/Node');
//const Edge = require('../models/Edge');
//const Operation = require('../models/Operation');
const logger = require('../utils/logger');
//const { generateId } = require('../utils/helpers');

// Create a new map
exports.createMap = async (req, res, next) => {
  try {
    const { title, description, ownerId } = req.body;
    
    const mapId = generateId('map');
    
    const map = new Map({
      mapId,
      title: title || 'Untitled Map',
      description: description || '',
      ownerId: ownerId || 'anonymous',
      vectorClock: new Map(),
      version: 0
    });
    
    await map.save();
    
    logger.info(`Map created: ${mapId}`);
    
    res.status(201).json({
      success: true,
      data: map
    });
  } catch (error) {
    next(error);
  }
};

// Get map by ID with all nodes and edges
exports.getMap = async (req, res, next) => {
  try {
    const { mapId } = req.params;
    
    const map = await Map.findOne({ mapId, isDeleted: false });
    
    if (!map) {
      return res.status(404).json({
        success: false,
        message: 'Map not found'
      });
    }
    
    // Get all nodes and edges
    const nodes = await Node.find({ mapId, isDeleted: false });
    const edges = await Edge.find({ mapId, isDeleted: false });
    
    res.json({
      success: true,
      data: {
        map,
        nodes,
        edges
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get all maps for a user
exports.getMaps = async (req, res, next) => {
  try {
    const { ownerId } = req.query;
    
    const query = { isDeleted: false };
    if (ownerId) {
      query.ownerId = ownerId;
    }
    
    const maps = await Map.find(query)
      .sort({ updatedAt: -1 })
      .select('-vectorClock');
    
    res.json({
      success: true,
      data: maps
    });
  } catch (error) {
    next(error);
  }
};

// Update map metadata
exports.updateMap = async (req, res, next) => {
  try {
    const { mapId } = req.params;
    const { title, description } = req.body;
    
    const map = await Map.findOne({ mapId, isDeleted: false });
    
    if (!map) {
      return res.status(404).json({
        success: false,
        message: 'Map not found'
      });
    }
    
    if (title) map.title = title;
    if (description !== undefined) map.description = description;
    
    map.version += 1;
    map.updatedAt = new Date();
    
    await map.save();
    
    logger.info(`Map updated: ${mapId}`);
    
    res.json({
      success: true,
      data: map
    });
  } catch (error) {
    next(error);
  }
};

// Delete map (soft delete)
exports.deleteMap = async (req, res, next) => {
  try {
    const { mapId } = req.params;
    
    const map = await Map.findOne({ mapId });
    
    if (!map) {
      return res.status(404).json({
        success: false,
        message: 'Map not found'
      });
    }
    
    // Soft delete map, nodes, and edges
    map.isDeleted = true;
    await map.save();
    
    await Node.updateMany({ mapId }, { isDeleted: true });
    await Edge.updateMany({ mapId }, { isDeleted: true });
    
    logger.info(`Map deleted: ${mapId}`);
    
    res.json({
      success: true,
      message: 'Map deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Get map statistics
exports.getMapStats = async (req, res, next) => {
  try {
    const { mapId } = req.params;
    
    const map = await Map.findOne({ mapId, isDeleted: false });
    
    if (!map) {
      return res.status(404).json({
        success: false,
        message: 'Map not found'
      });
    }
    
    const nodeCount = await Node.countDocuments({ mapId, isDeleted: false });
    const edgeCount = await Edge.countDocuments({ mapId, isDeleted: false });
    const operationCount = await Operation.countDocuments({ mapId });
    
    res.json({
      success: true,
      data: {
        mapId,
        nodeCount,
        edgeCount,
        operationCount,
        version: map.version,
        activeSessions: map.activeSessions.length,
        createdAt: map.createdAt,
        updatedAt: map.updatedAt
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = exports;