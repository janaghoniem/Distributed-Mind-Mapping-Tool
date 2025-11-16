// server/src/services/rollback.js
// Handles rolling back invalid operations

const Operation = require('../models/Operation');
const Node = require('../models/Node');
const Edge = require('../models/Edge');
const Map = require('../models/Map');
const logger = require('../utils/logger');

/**
 * Rollback a node operation
 */
async function rollbackNodeOperation(operation) {
  const { type, entityId, previousState, mapId } = operation;

  try {
    switch (type) {
      case 'NODE_CREATE':
      case 'addNode':
        // Delete the created node
        await Node.findOneAndUpdate(
          { mapId, nodeId: entityId },
          { isDeleted: true }
        );
        logger.info(`Rolled back node creation: ${entityId}`);
        break;

      case 'NODE_UPDATE':
      case 'updateNode':
        // Restore previous state
        if (previousState) {
          await Node.findOneAndUpdate(
            { mapId, nodeId: entityId },
            {
              content: previousState.content,
              position: previousState.position,
              style: previousState.style,
              vectorClock: previousState.vectorClock
            }
          );
          logger.info(`Rolled back node update: ${entityId}`);
        }
        break;

      case 'NODE_DELETE':
      case 'deleteNode':
        // Restore the node
        if (previousState) {
          await Node.findOneAndUpdate(
            { mapId, nodeId: entityId },
            { isDeleted: false, ...previousState }
          );
          logger.info(`Rolled back node deletion: ${entityId}`);
        }
        break;

      case 'NODE_MOVE':
        // Restore previous position
        if (previousState && previousState.position) {
          await Node.findOneAndUpdate(
            { mapId, nodeId: entityId },
            { position: previousState.position }
          );
          logger.info(`Rolled back node move: ${entityId}`);
        }
        break;
    }
  } catch (error) {
    logger.error(`Error rolling back node operation: ${error.message}`);
    throw error;
  }
}

/**
 * Rollback an edge operation
 */
async function rollbackEdgeOperation(operation) {
  const { type, entityId, previousState, mapId } = operation;

  try {
    switch (type) {
      case 'EDGE_CREATE':
      case 'addEdge':
        // Delete the created edge
        await Edge.findOneAndUpdate(
          { mapId, edgeId: entityId },
          { isDeleted: true }
        );
        logger.info(`Rolled back edge creation: ${entityId}`);
        break;

      case 'EDGE_UPDATE':
        // Restore previous state
        if (previousState) {
          await Edge.findOneAndUpdate(
            { mapId, edgeId: entityId },
            {
              label: previousState.label,
              style: previousState.style
            }
          );
          logger.info(`Rolled back edge update: ${entityId}`);
        }
        break;

      case 'EDGE_DELETE':
      case 'deleteEdge':
        // Restore the edge
        if (previousState) {
          await Edge.findOneAndUpdate(
            { mapId, edgeId: entityId },
            { isDeleted: false, ...previousState }
          );
          logger.info(`Rolled back edge deletion: ${entityId}`);
        }
        break;
    }
  } catch (error) {
    logger.error(`Error rolling back edge operation: ${error.message}`);
    throw error;
  }
}

/**
 * Main rollback function
 * Can accept either an operation object or operation data
 */
async function rollback(opOrData) {
  try {
    let operation;

    // If it's operation data, find the operation
    if (opOrData.operationId) {
      operation = await Operation.findOne({ operationId: opOrData.operationId });
    } else if (opOrData._id) {
      operation = await Operation.findById(opOrData._id);
    } else {
      // It's raw operation data, return rollback instruction
      logger.info(`Creating rollback instruction for: ${opOrData.type}`);
      return {
        action: 'rollback',
        operation: opOrData,
        reason: opOrData.reason || 'Invalid operation',
        timestamp: new Date()
      };
    }

    if (!operation) {
      logger.error('Operation not found for rollback');
      return {
        success: false,
        reason: 'Operation not found'
      };
    }

    // Check if already rolled back
    if (operation.status === 'rolled_back') {
      logger.warn(`Operation already rolled back: ${operation.operationId}`);
      return {
        success: false,
        reason: 'Operation already rolled back'
      };
    }

    // Perform rollback based on entity type
    if (operation.entityType === 'node') {
      await rollbackNodeOperation(operation);
    } else if (operation.entityType === 'edge') {
      await rollbackEdgeOperation(operation);
    } else {
      throw new Error(`Unknown entity type: ${operation.entityType}`);
    }

    // Mark operation as rolled back
    operation.rollback();
    await operation.save();

    // Update map stats
    const map = await Map.findOne({ mapId: operation.mapId });
    if (map) {
      if (operation.type.includes('CREATE')) {
        // Rollback of create = decrease count
        if (operation.entityType === 'node') {
          map.stats.nodeCount = Math.max(0, map.stats.nodeCount - 1);
        } else if (operation.entityType === 'edge') {
          map.stats.edgeCount = Math.max(0, map.stats.edgeCount - 1);
        }
      } else if (operation.type.includes('DELETE')) {
        // Rollback of delete = increase count
        if (operation.entityType === 'node') {
          map.stats.nodeCount += 1;
        } else if (operation.entityType === 'edge') {
          map.stats.edgeCount += 1;
        }
      }
      await map.save();
    }

    logger.success(`Operation rolled back: ${operation.operationId}`);

    return {
      success: true,
      operation: operation,
      message: 'Operation rolled back successfully'
    };

  } catch (error) {
    logger.error('[Rollback error]:', error);
    return {
      success: false,
      reason: 'Rollback failed',
      error: error.message
    };
  }
}

/**
 * Rollback multiple operations in sequence
 */
async function rollbackOperations(operationIds) {
  const results = [];

  for (const opId of operationIds) {
    const result = await rollback({ operationId: opId });
    results.push({
      operationId: opId,
      success: result.success,
      reason: result.reason
    });
  }

  return results;
}

module.exports = rollback;
module.exports.rollbackOperations = rollbackOperations;