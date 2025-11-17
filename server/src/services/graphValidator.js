// server/src/services/graphValidator.js
const Node = require('../models/Node');
const Edge = require('../models/Edge');
const GraphHelpers = require('../utils/graphHelpers');
const logger = require('../utils/logger');

class GraphValidator {
  
  /**
   * Validate entire graph structure
   * @param {String} mapId - Map ID to validate
   * @returns {Object} Validation result with errors and warnings
   */
  static async validateGraph(mapId) {
    try {
      const nodes = await Node.find({ mapId, isDeleted: false });
      const edges = await Edge.find({ mapId, isDeleted: false });
      
      const errors = [];
      const warnings = [];
      const fixes = [];
      
      // 1. Check for orphaned nodes
      const adjList = GraphHelpers.buildAdjacencyList(nodes, edges);
      const reverseAdjList = GraphHelpers.buildReverseAdjacencyList(nodes, edges);
      const rootIds = GraphHelpers.findRootNodes(nodes, reverseAdjList);
      const orphanedIds = GraphHelpers.findOrphanedNodes(nodes, adjList, rootIds);
      
      if (orphanedIds.length > 0) {
        warnings.push({
          type: 'ORPHANED_NODES',
          count: orphanedIds.length,
          nodeIds: orphanedIds,
          message: `Found ${orphanedIds.length} orphaned node(s) not connected to any root`
        });
        
        fixes.push({
          action: 'MARK_AS_ORPHAN',
          nodeIds: orphanedIds
        });
      }
      
      // 2. Check for cycles
      const cycle = GraphHelpers.detectCycle(adjList);
      if (cycle) {
        errors.push({
          type: 'CYCLE_DETECTED',
          cycle: cycle,
          message: `Circular dependency detected: ${cycle.join(' -> ')}`
        });
        
        fixes.push({
          action: 'BREAK_CYCLE',
          cycle: cycle,
          suggestedEdgeToRemove: {
            sourceId: cycle[cycle.length - 1],
            targetId: cycle[0]
          }
        });
      }
      
      // 3. Validate all edges point to existing nodes
      for (const edge of edges) {
        const sourceExists = nodes.some(n => n.nodeId === edge.sourceId);
        const targetExists = nodes.some(n => n.nodeId === edge.targetId);
        
        if (!sourceExists || !targetExists) {
          errors.push({
            type: 'DANGLING_EDGE',
            edgeId: edge.edgeId,
            sourceId: edge.sourceId,
            targetId: edge.targetId,
            message: `Edge points to non-existent node(s)`
          });
          
          fixes.push({
            action: 'DELETE_EDGE',
            edgeId: edge.edgeId
          });
        }
      }
      
      // 4. Check for duplicate edges
      const edgeMap = new Map();
      for (const edge of edges) {
        const key = `${edge.sourceId}->${edge.targetId}`;
        if (edgeMap.has(key)) {
          warnings.push({
            type: 'DUPLICATE_EDGE',
            edgeIds: [edgeMap.get(key), edge.edgeId],
            sourceId: edge.sourceId,
            targetId: edge.targetId,
            message: `Duplicate edge between same nodes`
          });
          
          fixes.push({
            action: 'DELETE_EDGE',
            edgeId: edge.edgeId,
            reason: 'duplicate'
          });
        } else {
          edgeMap.set(key, edge.edgeId);
        }
      }
      
      // 5. Check for self-loops
      const selfLoops = edges.filter(e => e.sourceId === e.targetId);
      if (selfLoops.length > 0) {
        errors.push({
          type: 'SELF_LOOPS',
          count: selfLoops.length,
          edges: selfLoops.map(e => ({
            edgeId: e.edgeId,
            nodeId: e.sourceId
          })),
          message: `Found ${selfLoops.length} self-loop(s)`
        });
        
        fixes.push({
          action: 'DELETE_EDGES',
          edgeIds: selfLoops.map(e => e.edgeId),
          reason: 'self-loop'
        });
      }
      
      // 6. Validate node depths
      const depths = GraphHelpers.calculateDepths(adjList, rootIds);
      for (const node of nodes) {
        const calculatedDepth = depths[node.nodeId] ?? -1;
        if (calculatedDepth !== node.depth && calculatedDepth >= 0) {
          warnings.push({
            type: 'INCORRECT_DEPTH',
            nodeId: node.nodeId,
            currentDepth: node.depth,
            correctDepth: calculatedDepth,
            message: `Node depth mismatch`
          });
          
          fixes.push({
            action: 'UPDATE_DEPTH',
            nodeId: node.nodeId,
            newDepth: calculatedDepth
          });
        }
      }
      
      // 7. Check graph connectivity
      const components = GraphHelpers.getConnectedComponents(nodes, adjList);
      if (components.length > 1) {
        warnings.push({
          type: 'DISCONNECTED_GRAPH',
          componentCount: components.length,
          components: components.map((comp, idx) => ({
            id: idx,
            nodeCount: comp.length,
            nodes: comp
          })),
          message: `Graph has ${components.length} disconnected components`
        });
      }
      
      // Calculate overall status
      const isValid = errors.length === 0;
      const stats = GraphHelpers.calculateStats(nodes, edges);
      
      return {
        valid: isValid,
        mapId,
        timestamp: new Date(),
        stats,
        errors,
        warnings,
        fixes,
        summary: {
          errorCount: errors.length,
          warningCount: warnings.length,
          fixableIssues: fixes.length
        }
      };
      
    } catch (error) {
      logger.error('Graph validation failed:', error);
      throw error;
    }
  }
  
  /**
   * Validate a single operation before applying
   * @param {Object} operation - Operation to validate
   * @param {String} mapId - Map ID
   * @returns {Object} { valid: boolean, errors: [], warnings: [] }
   */
  static async validateOperation(operation, mapId) {
    const errors = [];
    const warnings = [];
    
    try {
      switch (operation.type) {
        case 'ADD_NODE':
          await this._validateAddNode(operation, mapId, errors, warnings);
          break;
          
        case 'DELETE_NODE':
          await this._validateDeleteNode(operation, mapId, errors, warnings);
          break;
          
        case 'ADD_EDGE':
          await this._validateAddEdge(operation, mapId, errors, warnings);
          break;
          
        case 'DELETE_EDGE':
          await this._validateDeleteEdge(operation, mapId, errors, warnings);
          break;
          
        case 'MOVE_NODE':
          await this._validateMoveNode(operation, mapId, errors, warnings);
          break;
          
        case 'UPDATE_NODE':
          await this._validateUpdateNode(operation, mapId, errors, warnings);
          break;
          
        default:
          warnings.push({
            type: 'UNKNOWN_OPERATION',
            message: `Unknown operation type: ${operation.type}`
          });
      }
      
      return {
        valid: errors.length === 0,
        errors,
        warnings
      };
      
    } catch (error) {
      logger.error('Operation validation failed:', error);
      return {
        valid: false,
        errors: [{ type: 'VALIDATION_ERROR', message: error.message }],
        warnings
      };
    }
  }
  
  // Private validation methods
  
  static async _validateAddNode(operation, mapId, errors, warnings) {
    const { nodeId, parentId } = operation.data;
    
    // Check if node already exists
    const existing = await Node.findOne({ nodeId, mapId });
    if (existing && !existing.isDeleted) {
      errors.push({
        type: 'NODE_EXISTS',
        nodeId,
        message: 'Node already exists'
      });
    }
    
    // If has parent, check parent exists
    if (parentId) {
      const parent = await Node.findOne({ nodeId: parentId, mapId, isDeleted: false });
      if (!parent) {
        errors.push({
          type: 'PARENT_NOT_FOUND',
          parentId,
          message: 'Parent node does not exist'
        });
      }
    }
  }
  
  static async _validateDeleteNode(operation, mapId, errors, warnings) {
    const { nodeId } = operation.data;
    
    // Check if node exists
    const node = await Node.findOne({ nodeId, mapId, isDeleted: false });
    if (!node) {
      errors.push({
        type: 'NODE_NOT_FOUND',
        nodeId,
        message: 'Node does not exist'
      });
      return;
    }
    
    // Check for children
    const children = await Node.find({ parentId: nodeId, mapId, isDeleted: false });
    if (children.length > 0) {
      warnings.push({
        type: 'HAS_CHILDREN',
        nodeId,
        childCount: children.length,
        message: 'Deleting node will orphan children'
      });
    }
  }
  
  static async _validateAddEdge(operation, mapId, errors, warnings) {
    const { edgeId, sourceId, targetId } = operation.data;
    
    // Check if edge already exists
    const existing = await Edge.findOne({ edgeId, mapId });
    if (existing && !existing.isDeleted) {
      errors.push({
        type: 'EDGE_EXISTS',
        edgeId,
        message: 'Edge already exists'
      });
    }
    
    // Check source and target exist
    const source = await Node.findOne({ nodeId: sourceId, mapId, isDeleted: false });
    const target = await Node.findOne({ nodeId: targetId, mapId, isDeleted: false });
    
    if (!source) {
      errors.push({
        type: 'SOURCE_NOT_FOUND',
        sourceId,
        message: 'Source node does not exist'
      });
    }
    
    if (!target) {
      errors.push({
        type: 'TARGET_NOT_FOUND',
        targetId,
        message: 'Target node does not exist'
      });
    }
    
    // Check for self-loop
    if (sourceId === targetId) {
      errors.push({
        type: 'SELF_LOOP',
        nodeId: sourceId,
        message: 'Self-loops are not allowed'
      });
    }
    
    // Check if would create cycle
    if (source && target) {
      const nodes = await Node.find({ mapId, isDeleted: false });
      const edges = await Edge.find({ mapId, isDeleted: false });
      const adjList = GraphHelpers.buildAdjacencyList(nodes, edges);
      
      // Temporarily add the new edge
      if (!adjList[sourceId]) adjList[sourceId] = [];
      adjList[sourceId].push(targetId);
      
      const cycle = GraphHelpers.detectCycle(adjList);
      if (cycle) {
        errors.push({
          type: 'WOULD_CREATE_CYCLE',
          cycle,
          message: `Adding this edge would create a cycle: ${cycle.join(' -> ')}`
        });
      }
    }
  }
  
  static async _validateDeleteEdge(operation, mapId, errors, warnings) {
    const { edgeId } = operation.data;
    
    // Check if edge exists
    const edge = await Edge.findOne({ edgeId, mapId, isDeleted: false });
    if (!edge) {
      errors.push({
        type: 'EDGE_NOT_FOUND',
        edgeId,
        message: 'Edge does not exist'
      });
    }
  }
  
  static async _validateMoveNode(operation, mapId, errors, warnings) {
    const { nodeId, newPosition } = operation.data;
    
    // Check if node exists
    const node = await Node.findOne({ nodeId, mapId, isDeleted: false });
    if (!node) {
      errors.push({
        type: 'NODE_NOT_FOUND',
        nodeId,
        message: 'Node does not exist'
      });
    }
    
    // Validate position
    if (!newPosition || typeof newPosition.x !== 'number' || typeof newPosition.y !== 'number') {
      errors.push({
        type: 'INVALID_POSITION',
        position: newPosition,
        message: 'Invalid position coordinates'
      });
    }
  }
  
  static async _validateUpdateNode(operation, mapId, errors, warnings) {
    const { nodeId, updates } = operation.data;
    
    // Check if node exists
    const node = await Node.findOne({ nodeId, mapId, isDeleted: false });
    if (!node) {
      errors.push({
        type: 'NODE_NOT_FOUND',
        nodeId,
        message: 'Node does not exist'
      });
    }
    
    // Validate content length
    if (updates.content && updates.content.length > 5000) {
      errors.push({
        type: 'CONTENT_TOO_LONG',
        length: updates.content.length,
        maxLength: 5000,
        message: 'Node content exceeds maximum length'
      });
    }
  }
  
  /**
   * Apply automatic fixes to graph
   * @param {String} mapId - Map ID
   * @param {Array} fixes - Array of fix actions from validation
   * @returns {Object} Result of fix operations
   */
  static async applyFixes(mapId, fixes) {
    const applied = [];
    const failed = [];
    
    for (const fix of fixes) {
      try {
        switch (fix.action) {
          case 'MARK_AS_ORPHAN':
            await Node.updateMany(
              { nodeId: { $in: fix.nodeIds }, mapId },
              { $set: { isOrphan: true } }
            );
            applied.push(fix);
            break;
            
          case 'DELETE_EDGE':
            await Edge.updateOne(
              { edgeId: fix.edgeId, mapId },
              { $set: { isDeleted: true } }
            );
            applied.push(fix);
            break;
            
          case 'DELETE_EDGES':
            await Edge.updateMany(
              { edgeId: { $in: fix.edgeIds }, mapId },
              { $set: { isDeleted: true } }
            );
            applied.push(fix);
            break;
            
          case 'UPDATE_DEPTH':
            await Node.updateOne(
              { nodeId: fix.nodeId, mapId },
              { $set: { depth: fix.newDepth } }
            );
            applied.push(fix);
            break;
            
          case 'BREAK_CYCLE':
            const { sourceId, targetId } = fix.suggestedEdgeToRemove;
            await Edge.updateOne(
              { sourceId, targetId, mapId },
              { $set: { isDeleted: true } }
            );
            applied.push(fix);
            break;
            
          default:
            failed.push({ fix, reason: 'Unknown fix action' });
        }
      } catch (error) {
        logger.error(`Failed to apply fix:`, error);
        failed.push({ fix, reason: error.message });
      }
    }
    
    return {
      applied: applied.length,
      failed: failed.length,
      details: { applied, failed }
    };
  }
}

module.exports = GraphValidator;