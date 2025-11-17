// server/src/controllers/operationController.js
const Operation = require('../models/Operation');
const logger = require('../utils/logger');

class OperationController {
  
  // Get all operations for a map
  static async getOperations(req, res) {
    try {
      const { mapId } = req.params;
      const { limit = 100 } = req.query;
      
      const operations = await Operation.find({ mapId })
        .sort({ timestamp: -1 })
        .limit(parseInt(limit));
      
      res.json({
        success: true,
        count: operations.length,
        operations
      });
    } catch (error) {
      logger.error('Get operations error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
  
  // Get operations since a sequence number
  static async getOperationsSince(req, res) {
    try {
      const { mapId, sequence } = req.params;
      
      const operations = await Operation.find({
        mapId,
        sequence: { $gt: parseInt(sequence) }
      }).sort({ sequence: 1 });
      
      res.json({
        success: true,
        count: operations.length,
        operations
      });
    } catch (error) {
      logger.error('Get operations since error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
  
  // Get conflicting operations
  static async getConflicts(req, res) {
    try {
      const { mapId } = req.params;
      
      const conflicts = await Operation.find({
        mapId,
        hasConflict: true
      }).sort({ timestamp: -1 });
      
      res.json({
        success: true,
        count: conflicts.length,
        conflicts
      });
    } catch (error) {
      logger.error('Get conflicts error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
  
  // Get operation statistics
  static async getOperationStats(req, res) {
    try {
      const { mapId } = req.params;
      
      const stats = await Operation.aggregate([
        { $match: { mapId } },
        {
          $group: {
            _id: '$type',
            count: { $sum: 1 },
            conflicts: {
              $sum: { $cond: ['$hasConflict', 1, 0] }
            }
          }
        }
      ]);
      
      const total = await Operation.countDocuments({ mapId });
      const conflictTotal = await Operation.countDocuments({ 
        mapId, 
        hasConflict: true 
      });
      
      res.json({
        success: true,
        stats: {
          total,
          conflicts: conflictTotal,
          byType: stats
        }
      });
    } catch (error) {
      logger.error('Get operation stats error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
  
  // Get single operation
  static async getOperation(req, res) {
    try {
      const { operationId } = req.params;
      
      const operation = await Operation.findOne({ operationId });
      
      if (!operation) {
        return res.status(404).json({
          success: false,
          error: 'Operation not found'
        });
      }
      
      res.json({
        success: true,
        operation
      });
    } catch (error) {
      logger.error('Get operation error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
  
  // Rollback operation
  static async rollbackOperation(req, res) {
    try {
      const { operationId } = req.params;
      
      const operation = await Operation.findOne({ operationId });
      
      if (!operation) {
        return res.status(404).json({
          success: false,
          error: 'Operation not found'
        });
      }
      
      // Mark as rolled back
      operation.isRolledBack = true;
      operation.rolledBackAt = new Date();
      await operation.save();
      
      logger.info(`Operation rolled back: ${operationId}`);
      
      res.json({
        success: true,
        message: 'Operation rolled back',
        operation
      });
    } catch (error) {
      logger.error('Rollback operation error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}

module.exports = OperationController;