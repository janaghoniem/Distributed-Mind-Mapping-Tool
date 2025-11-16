// server/src/services/merge.js
// MIGRATED + ENHANCED VERSION of your merge logic

const Map = require('../models/Map');
const Node = require('../models/Node');
const Edge = require('../models/Edge');
const Operation = require('../models/Operation');
const vectorClockService = require('./vectorClock');
const logger = require('../utils/logger');

/**
 * Compares two vector clocks.
 * Returns:
 *  -1 → incoming operation is older
 *   0 → concurrent
 *   1 → incoming operation is newer
 */
function compareVectorClocks(currentVC, incomingVC) {
  let isGreater = false;
  let isLess = false;

  const users = new Set([
    ...Object.keys(currentVC || {}),
    ...Object.keys(incomingVC || {})
  ]);

  for (const user of users) {
    const a = currentVC[user] || 0;
    const b = incomingVC[user] || 0;

    if (a < b) isGreater = true;
    if (a > b) isLess = true;
  }

  if (isGreater && !isLess) return 1;   // incoming is newer
  if (isLess && !isGreater) return -1;  // incoming is older
  return 0;                              // concurrent
}

/**
 * Apply operation to node
 */
async function applyNodeOperation(mapId, op) {
  switch (op.type) {
    case 'addNode':
    case 'NODE_CREATE':
      const newNode = new Node({
        nodeId: op.node.id || op.nodeId,
        mapId,
        content: {
          text: op.node.label || op.node.text || 'New Node',
          type: 'text'
        },
        position: op.node.position || { x: 0, y: 0 },
        createdBy: op.userId || op.clientId,
        lastModifiedBy: op.userId || op.clientId,
        vectorClock: vectorClockService.fromObject(op.vc || {})
      });
      await newNode.save();
      return { success: true, entity: newNode };

    case 'updateNode':
    case 'NODE_UPDATE':
      const nodeToUpdate = await Node.findOne({
        mapId,
        nodeId: op.node.id || op.nodeId,
        isDeleted: false
      });

      if (!nodeToUpdate) {
        return { success: false, reason: 'Node not found' };
      }

      // Check vector clock for concurrency
      const comparison = compareVectorClocks(
        vectorClockService.toObject(nodeToUpdate.vectorClock),
        op.vc || {}
      );

      if (comparison === -1) {
        return { success: false, reason: 'Outdated edit (older vector clock)' };
      }

      // Apply update (Last-Write-Wins for concurrent edits)
      if (op.node.label) {
        nodeToUpdate.content.text = op.node.label;
      }
      if (op.node.text) {
        nodeToUpdate.content.text = op.node.text;
      }
      if (op.node.position) {
        nodeToUpdate.position = op.node.position;
      }

      // Merge vector clocks
      nodeToUpdate.vectorClock = vectorClockService.merge(
        nodeToUpdate.vectorClock,
        vectorClockService.fromObject(op.vc || {})
      );

      nodeToUpdate.lastModifiedBy = op.userId || op.clientId;
      nodeToUpdate.version += 1;

      await nodeToUpdate.save();
      return { success: true, entity: nodeToUpdate };

    case 'deleteNode':
    case 'NODE_DELETE':
      const nodeToDelete = await Node.findOne({
        mapId,
        nodeId: op.nodeId || op.node?.id,
        isDeleted: false
      });

      if (!nodeToDelete) {
        return { success: false, reason: 'Node not found' };
      }

      // Soft delete
      nodeToDelete.softDelete(op.userId || op.clientId);
      await nodeToDelete.save();

      // Also delete connected edges
      await Edge.updateMany(
        {
          mapId,
          $or: [
            { sourceNodeId: nodeToDelete.nodeId },
            { targetNodeId: nodeToDelete.nodeId }
          ],
          isDeleted: false
        },
        {
          isDeleted: true,
          lastModifiedBy: op.userId || op.clientId
        }
      );

      return { success: true, entity: nodeToDelete };

    default:
      return { success: false, reason: `Unknown operation type: ${op.type}` };
  }
}

/**
 * Apply operation to edge
 */
async function applyEdgeOperation(mapId, op) {
  switch (op.type) {
    case 'addEdge':
    case 'EDGE_CREATE':
      // Validate nodes exist
      const sourceExists = await Node.exists({
        mapId,
        nodeId: op.edge.from,
        isDeleted: false
      });
      const targetExists = await Node.exists({
        mapId,
        nodeId: op.edge.to,
        isDeleted: false
      });

      if (!sourceExists || !targetExists) {
        return { success: false, reason: 'Source or target node not found' };
      }

      const newEdge = new Edge({
        edgeId: op.edge.id || `edge_${Date.now()}`,
        mapId,
        sourceNodeId: op.edge.from,
        targetNodeId: op.edge.to,
        createdBy: op.userId || op.clientId,
        lastModifiedBy: op.userId || op.clientId,
        vectorClock: vectorClockService.fromObject(op.vc || {})
      });

      await newEdge.save();
      return { success: true, entity: newEdge };

    case 'deleteEdge':
    case 'EDGE_DELETE':
      const edgeToDelete = await Edge.findOne({
        mapId,
        sourceNodeId: op.edge.from,
        targetNodeId: op.edge.to,
        isDeleted: false
      });

      if (!edgeToDelete) {
        return { success: false, reason: 'Edge not found' };
      }

      edgeToDelete.softDelete(op.userId || op.clientId);
      await edgeToDelete.save();

      return { success: true, entity: edgeToDelete };

    default:
      return { success: false, reason: `Unknown operation type: ${op.type}` };
  }
}

/**
 * Main merge function with vector clock awareness.
 * This is your original merge logic enhanced with new architecture.
 */
async function merge(op) {
  try {
    logger.info(`Merging operation: ${op.type} for map ${op.mapId}`);

    // Load current map state
    const map = await Map.findOne({ mapId: op.mapId, isDeleted: false });
    if (!map) {
      return { valid: false, reason: 'Map not found' };
    }

    const incomingVC = op.vc || {};
    const currentVC = vectorClockService.toObject(map.vectorClock);

    // Compare vector clocks at map level
    const comparison = compareVectorClocks(currentVC, incomingVC);

    if (comparison === -1) {
      // Incoming op is older → reject it
      logger.warn('Operation rejected: older vector clock');
      return {
        valid: false,
        reason: 'Outdated edit (older vector clock)'
      };
    }

    // Determine operation category
    let result;
    if (op.type.includes('Node') || op.type.includes('node')) {
      result = await applyNodeOperation(op.mapId, op);
    } else if (op.type.includes('Edge') || op.type.includes('edge')) {
      result = await applyEdgeOperation(op.mapId, op);
    } else {
      return { valid: false, reason: 'Unknown operation category' };
    }

    if (!result.success) {
      return { valid: false, reason: result.reason };
    }

    // Merge vector clocks at map level
    const mergedVC = { ...currentVC };
    for (const user in incomingVC) {
      mergedVC[user] = Math.max(mergedVC[user] || 0, incomingVC[user]);
    }
    map.vectorClock = vectorClockService.fromObject(mergedVC);
    map.version += 1;

    // Update map stats
    if (op.type.includes('Node') && op.type.includes('CREATE')) {
      map.stats.nodeCount += 1;
    } else if (op.type.includes('Node') && op.type.includes('DELETE')) {
      map.stats.nodeCount -= 1;
    } else if (op.type.includes('Edge') && op.type.includes('CREATE')) {
      map.stats.edgeCount += 1;
    } else if (op.type.includes('Edge') && op.type.includes('DELETE')) {
      map.stats.edgeCount -= 1;
    }

    await map.save();

    // Log operation
    const serverSequence = await Operation.getNextServerSequence(op.mapId);
    const operation = new Operation({
      operationId: op.operationId || `op_${Date.now()}`,
      mapId: op.mapId,
      type: op.type,
      entityId: result.entity.nodeId || result.entity.edgeId,
      entityType: op.type.includes('Node') ? 'node' : 'edge',
      payload: op,
      vectorClock: vectorClockService.fromObject(incomingVC),
      clientId: op.clientId || 'unknown',
      sessionId: op.sessionId || 'unknown',
      userId: op.userId || op.clientId || 'unknown',
      clientSequence: incomingVC[op.clientId] || 0,
      serverSequence,
      status: 'applied'
    });

    await operation.save();

    logger.success(`Operation merged successfully: ${op.type}`);

    return {
      valid: true,
      op,
      mergedState: map,
      entity: result.entity,
      operation: {
        operationId: operation.operationId,
        serverSequence: operation.serverSequence
      }
    };

  } catch (err) {
    logger.error('[Merge error]:', err);
    return {
      valid: false,
      reason: 'Merge failed',
      error: err.message
    };
  }
}

module.exports = merge;