// server/src/controllers/mapController.js
const Map = require('../models/Map');
const Node = require('../models/Node');
const Edge = require('../models/Edge');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

class MapController {
  
  // Create new map
  static async createMap(req, res) {
    try {
      const { name, description } = req.body;
      
      const newMap = new Map({
        mapId: `map_${uuidv4()}`,
        name: name || 'Untitled Map',
        description: description || '',
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      await newMap.save();
      
      logger.info(`✅ Map created: ${newMap.mapId}`);
      
      res.status(201).json({
        success: true,
        map: newMap
      });
    } catch (error) {
      logger.error('Create map error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
  
  // Get all maps
  static async getMaps(req, res) {
    try {
      const { limit = 50, skip = 0 } = req.query;
      
      const maps = await Map.find({ isDeleted: false })
        .sort({ updatedAt: -1 })
        .limit(parseInt(limit))
        .skip(parseInt(skip));
      
      const total = await Map.countDocuments({ isDeleted: false });
      
      res.json({
        success: true,
        total,
        count: maps.length,
        maps
      });
    } catch (error) {
      logger.error('Get maps error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
  
  // Get single map with nodes and edges
  static async getMap(req, res) {
    try {
      const { mapId } = req.params;
      
      const map = await Map.findOne({ mapId, isDeleted: false });
      if (!map) {
        return res.status(404).json({
          success: false,
          error: 'Map not found'
        });
      }
      
      const nodes = await Node.find({ mapId, isDeleted: false });
      const edges = await Edge.find({ mapId, isDeleted: false });
      
      res.json({
        success: true,
        map,
        nodes,
        edges
      });
    } catch (error) {
      logger.error('Get map error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
  
  // Update map
  static async updateMap(req, res) {
    try {
      const { mapId } = req.params;
      const { name, description, settings } = req.body;
      
      const updates = {};
      if (name !== undefined) updates.name = name;
      if (description !== undefined) updates.description = description;
      if (settings !== undefined) updates.settings = settings;
      updates.updatedAt = new Date();
      
      const map = await Map.findOneAndUpdate(
        { mapId, isDeleted: false },
        { $set: updates },
        { new: true }
      );
      
      if (!map) {
        return res.status(404).json({
          success: false,
          error: 'Map not found'
        });
      }
      
      logger.info(`✅ Map updated: ${mapId}`);
      
      res.json({
        success: true,
        map
      });
    } catch (error) {
      logger.error('Update map error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
  
  // Delete map
  static async deleteMap(req, res) {
    try {
      const { mapId } = req.params;
      
      await Map.updateOne({ mapId }, { $set: { isDeleted: true, updatedAt: new Date() } });
      await Node.updateMany({ mapId }, { $set: { isDeleted: true, updatedAt: new Date() } });
      await Edge.updateMany({ mapId }, { $set: { isDeleted: true, updatedAt: new Date() } });
      
      logger.info(`✅ Map deleted: ${mapId}`);
      
      res.json({
        success: true,
        message: 'Map deleted successfully'
      });
    } catch (error) {
      logger.error('Delete map error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
  
  // Get map statistics
  static async getMapStats(req, res) {
    try {
      const { mapId } = req.params;
      
      const map = await Map.findOne({ mapId, isDeleted: false });
      if (!map) {
        return res.status(404).json({
          success: false,
          error: 'Map not found'
        });
      }
      
      const nodeCount = await Node.countDocuments({ mapId, isDeleted: false });
      const edgeCount = await Edge.countDocuments({ mapId, isDeleted: false });
      
      res.json({
        success: true,
        stats: {
          mapId,
          name: map.name,
          nodeCount,
          edgeCount,
          createdAt: map.createdAt,
          updatedAt: map.updatedAt
        }
      });
    } catch (error) {
      logger.error('Get map stats error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}

module.exports = MapController;