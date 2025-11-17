// server/src/controllers/graphController.js
const Node = require('../models/Node');
const Edge = require('../models/Edge');
const GraphValidator = require('../services/graphValidator');
const GraphHelpers = require('../utils/graphHelpers');
const LayoutEngine = require('../utils/layoutEngine');
const logger = require('../utils/logger');

class GraphController {
  
  /**
   * GET /api/graphs/:mapId/validate
   * Validate entire graph structure
   */
  static async validateGraph(req, res) {
    try {
      const { mapId } = req.params;
      const validation = await GraphValidator.validateGraph(mapId);
      
      res.json({
        success: true,
        validation
      });
    } catch (error) {
      logger.error('Graph validation error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
  
  /**
   * POST /api/graphs/:mapId/validate/operation
   * Validate a single operation before applying
   */
  static async validateOperation(req, res) {
    try {
      const { mapId } = req.params;
      const { operation } = req.body;
      
      const validation = await GraphValidator.validateOperation(operation, mapId);
      
      res.json({
        success: true,
        validation
      });
    } catch (error) {
      logger.error('Operation validation error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
  
  /**
   * POST /api/graphs/:mapId/fix
   * Apply automatic fixes to graph
   */
  static async applyFixes(req, res) {
    try {
      const { mapId } = req.params;
      const { fixes } = req.body;
      
      const result = await GraphValidator.applyFixes(mapId, fixes);
      
      // Re-validate after fixes
      const validation = await GraphValidator.validateGraph(mapId);
      
      res.json({
        success: true,
        fixes: result,
        validation
      });
    } catch (error) {
      logger.error('Apply fixes error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
  
  /**
   * GET /api/graphs/:mapId/stats
   * Get graph statistics
   */
  static async getStats(req, res) {
    try {
      const { mapId } = req.params;
      
      const nodes = await Node.find({ mapId, isDeleted: false });
      const edges = await Edge.find({ mapId, isDeleted: false });
      
      const stats = GraphHelpers.calculateStats(nodes, edges);
      
      res.json({
        success: true,
        stats
      });
    } catch (error) {
      logger.error('Get stats error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
  
  /**
   * GET /api/graphs/:mapId/orphans
   * Find orphaned nodes
   */
  static async findOrphans(req, res) {
    try {
      const { mapId } = req.params;
      
      const nodes = await Node.find({ mapId, isDeleted: false });
      const edges = await Edge.find({ mapId, isDeleted: false });
      
      const adjList = GraphHelpers.buildAdjacencyList(nodes, edges);
      const reverseAdjList = GraphHelpers.buildReverseAdjacencyList(nodes, edges);
      const rootIds = GraphHelpers.findRootNodes(nodes, reverseAdjList);
      const orphanIds = GraphHelpers.findOrphanedNodes(nodes, adjList, rootIds);
      
      const orphanNodes = nodes.filter(n => orphanIds.includes(n.nodeId));
      
      res.json({
        success: true,
        count: orphanIds.length,
        orphans: orphanNodes
      });
    } catch (error) {
      logger.error('Find orphans error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
  
  /**
   * GET /api/graphs/:mapId/cycles
   * Detect cycles in graph
   */
  static async detectCycles(req, res) {
    try {
      const { mapId } = req.params;
      
      const nodes = await Node.find({ mapId, isDeleted: false });
      const edges = await Edge.find({ mapId, isDeleted: false });
      
      const adjList = GraphHelpers.buildAdjacencyList(nodes, edges);
      const cycle = GraphHelpers.detectCycle(adjList);
      
      res.json({
        success: true,
        hasCycle: cycle !== null,
        cycle: cycle || []
      });
    } catch (error) {
      logger.error('Detect cycles error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
  
  /**
   * GET /api/graphs/:mapId/node/:nodeId/descendants
   * Get all descendants of a node
   */
  static async getDescendants(req, res) {
    try {
      const { mapId, nodeId } = req.params;
      
      const nodes = await Node.find({ mapId, isDeleted: false });
      const edges = await Edge.find({ mapId, isDeleted: false });
      
      const adjList = GraphHelpers.buildAdjacencyList(nodes, edges);
      const descendantIds = GraphHelpers.findDescendants(adjList, nodeId);
      
      const descendants = nodes.filter(n => descendantIds.has(n.nodeId));
      
      res.json({
        success: true,
        count: descendants.length,
        descendants
      });
    } catch (error) {
      logger.error('Get descendants error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
  
  /**
   * GET /api/graphs/:mapId/node/:nodeId/ancestors
   * Get all ancestors of a node
   */
  static async getAncestors(req, res) {
    try {
      const { mapId, nodeId } = req.params;
      
      const nodes = await Node.find({ mapId, isDeleted: false });
      const edges = await Edge.find({ mapId, isDeleted: false });
      
      const reverseAdjList = GraphHelpers.buildReverseAdjacencyList(nodes, edges);
      const ancestorIds = GraphHelpers.findAncestors(reverseAdjList, nodeId);
      
      const ancestors = nodes.filter(n => ancestorIds.has(n.nodeId));
      
      res.json({
        success: true,
        count: ancestors.length,
        ancestors
      });
    } catch (error) {
      logger.error('Get ancestors error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
  
  /**
   * POST /api/graphs/:mapId/layout
   * Apply automatic layout to graph
   */
  static async applyLayout(req, res) {
    try {
      const { mapId } = req.params;
      const { layoutType, options } = req.body;
      
      const nodes = await Node.find({ mapId, isDeleted: false });
      const edges = await Edge.find({ mapId, isDeleted: false });
      
      let positions;
      
      switch (layoutType) {
        case 'hierarchical':
          positions = LayoutEngine.hierarchicalLayout(nodes, edges, options);
          break;
        case 'force-directed':
          positions = LayoutEngine.forceDirectedLayout(nodes, edges, options);
          break;
        case 'grid':
          positions = LayoutEngine.gridLayout(nodes, options);
          break;
        case 'radial':
          positions = LayoutEngine.radialLayout(nodes, edges, options);
          break;
        case 'auto':
          positions = LayoutEngine.autoLayout(nodes, edges, options);
          break;
        default:
          return res.status(400).json({
            success: false,
            error: 'Invalid layout type'
          });
      }
      
      // Update node positions in database
      const updates = Object.entries(positions).map(([nodeId, position]) => ({
        updateOne: {
          filter: { nodeId, mapId },
          update: { $set: { position } }
        }
      }));
      
      await Node.bulkWrite(updates);
      
      res.json({
        success: true,
        layoutType,
        positions
      });
    } catch (error) {
      logger.error('Apply layout error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
  
  /**
   * GET /api/graphs/:mapId/components
   * Get connected components
   */
  static async getComponents(req, res) {
    try {
      const { mapId } = req.params;
      
      const nodes = await Node.find({ mapId, isDeleted: false });
      const edges = await Edge.find({ mapId, isDeleted: false });
      
      const adjList = GraphHelpers.buildAdjacencyList(nodes, edges);
      const components = GraphHelpers.getConnectedComponents(nodes, adjList);
      
      res.json({
        success: true,
        count: components.length,
        components: components.map((comp, idx) => ({
          id: idx,
          nodeCount: comp.length,
          nodes: comp
        }))
      });
    } catch (error) {
      logger.error('Get components error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
  
  /**
   * POST /api/graphs/:mapId/edge/check-cycle
   * Check if adding an edge would create a cycle
   */
  static async checkCycle(req, res) {
    try {
      const { mapId } = req.params;
      const { sourceId, targetId } = req.body;
      
      const nodes = await Node.find({ mapId, isDeleted: false });
      const edges = await Edge.find({ mapId, isDeleted: false });
      
      const adjList = GraphHelpers.buildAdjacencyList(nodes, edges);
      const wouldCreateCycle = GraphHelpers.wouldCreateCycle(adjList, sourceId, targetId);
      
      res.json({
        success: true,
        wouldCreateCycle,
        sourceId,
        targetId
      });
    } catch (error) {
      logger.error('Check cycle error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}

module.exports = GraphController;