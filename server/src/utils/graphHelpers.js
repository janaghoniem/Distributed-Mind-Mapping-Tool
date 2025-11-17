// server/src/utils/graphHelpers.js

/**
 * Graph Utility Functions for Mind Map Operations
 */

class GraphHelpers {
  
  /**
   * Build adjacency list from nodes and edges
   * @param {Array} nodes - Array of node objects
   * @param {Array} edges - Array of edge objects
   * @returns {Object} Adjacency list { nodeId: [childIds] }
   */
  static buildAdjacencyList(nodes, edges) {
    const adjList = {};
    
    // Initialize with all nodes
    nodes.forEach(node => {
      adjList[node.nodeId] = [];
    });
    
    // Add edges
    edges.forEach(edge => {
      if (!edge.isDeleted && adjList[edge.sourceId]) {
        adjList[edge.sourceId].push(edge.targetId);
      }
    });
    
    return adjList;
  }
  
  /**
   * Build reverse adjacency list (parent pointers)
   * @param {Array} nodes - Array of node objects
   * @param {Array} edges - Array of edge objects
   * @returns {Object} Reverse adjacency list { nodeId: [parentIds] }
   */
  static buildReverseAdjacencyList(nodes, edges) {
    const reverseList = {};
    
    // Initialize
    nodes.forEach(node => {
      reverseList[node.nodeId] = [];
    });
    
    // Add reverse edges
    edges.forEach(edge => {
      if (!edge.isDeleted && reverseList[edge.targetId]) {
        reverseList[edge.targetId].push(edge.sourceId);
      }
    });
    
    return reverseList;
  }
  
  /**
   * Find all root nodes (nodes with no incoming edges)
   * @param {Array} nodes - Array of node objects
   * @param {Object} reverseAdjList - Reverse adjacency list
   * @returns {Array} Array of root node IDs
   */
  static findRootNodes(nodes, reverseAdjList) {
    return nodes
      .filter(node => !node.isDeleted && reverseAdjList[node.nodeId].length === 0)
      .map(node => node.nodeId);
  }
  
  /**
   * Detect cycles using DFS
   * @param {Object} adjList - Adjacency list
   * @param {String} startNodeId - Starting node for DFS
   * @returns {Array|null} Array of node IDs in cycle, or null if no cycle
   */
  static detectCycle(adjList, startNodeId = null) {
    const visited = new Set();
    const recStack = new Set();
    const path = [];
    
    const dfs = (nodeId) => {
      if (!adjList[nodeId]) return null;
      
      visited.add(nodeId);
      recStack.add(nodeId);
      path.push(nodeId);
      
      for (const neighbor of adjList[nodeId]) {
        if (!visited.has(neighbor)) {
          const cycle = dfs(neighbor);
          if (cycle) return cycle;
        } else if (recStack.has(neighbor)) {
          // Found cycle - return path from neighbor to current
          const cycleStart = path.indexOf(neighbor);
          return path.slice(cycleStart);
        }
      }
      
      recStack.delete(nodeId);
      path.pop();
      return null;
    };
    
    // Check from specific node or all nodes
    if (startNodeId) {
      return dfs(startNodeId);
    }
    
    for (const nodeId in adjList) {
      if (!visited.has(nodeId)) {
        const cycle = dfs(nodeId);
        if (cycle) return cycle;
      }
    }
    
    return null;
  }
  
  /**
   * Find all descendants of a node using BFS
   * @param {Object} adjList - Adjacency list
   * @param {String} nodeId - Starting node ID
   * @returns {Set} Set of descendant node IDs
   */
  static findDescendants(adjList, nodeId) {
    const descendants = new Set();
    const queue = [nodeId];
    
    while (queue.length > 0) {
      const current = queue.shift();
      
      if (adjList[current]) {
        for (const child of adjList[current]) {
          if (!descendants.has(child)) {
            descendants.add(child);
            queue.push(child);
          }
        }
      }
    }
    
    return descendants;
  }
  
  /**
   * Find all ancestors of a node
   * @param {Object} reverseAdjList - Reverse adjacency list
   * @param {String} nodeId - Starting node ID
   * @returns {Set} Set of ancestor node IDs
   */
  static findAncestors(reverseAdjList, nodeId) {
    const ancestors = new Set();
    const queue = [nodeId];
    
    while (queue.length > 0) {
      const current = queue.shift();
      
      if (reverseAdjList[current]) {
        for (const parent of reverseAdjList[current]) {
          if (!ancestors.has(parent)) {
            ancestors.add(parent);
            queue.push(parent);
          }
        }
      }
    }
    
    return ancestors;
  }
  
  /**
   * Calculate depth of each node from roots
   * @param {Object} adjList - Adjacency list
   * @param {Array} rootIds - Array of root node IDs
   * @returns {Object} Map of nodeId to depth
   */
  static calculateDepths(adjList, rootIds) {
    const depths = {};
    const queue = rootIds.map(id => ({ id, depth: 0 }));
    
    while (queue.length > 0) {
      const { id, depth } = queue.shift();
      
      if (depths[id] === undefined || depth < depths[id]) {
        depths[id] = depth;
        
        if (adjList[id]) {
          for (const child of adjList[id]) {
            queue.push({ id: child, depth: depth + 1 });
          }
        }
      }
    }
    
    return depths;
  }
  
  /**
   * Find orphaned nodes (nodes not reachable from any root)
   * @param {Array} nodes - Array of node objects
   * @param {Object} adjList - Adjacency list
   * @param {Array} rootIds - Array of root node IDs
   * @returns {Array} Array of orphaned node IDs
   */
  static findOrphanedNodes(nodes, adjList, rootIds) {
    const reachable = new Set();
    
    // BFS from all roots
    const queue = [...rootIds];
    while (queue.length > 0) {
      const current = queue.shift();
      reachable.add(current);
      
      if (adjList[current]) {
        for (const child of adjList[current]) {
          if (!reachable.has(child)) {
            queue.push(child);
          }
        }
      }
    }
    
    // Find nodes not reachable
    return nodes
      .filter(node => !node.isDeleted && !reachable.has(node.nodeId))
      .map(node => node.nodeId);
  }
  
  /**
   * Topological sort (for hierarchical layout)
   * @param {Object} adjList - Adjacency list
   * @param {Array} rootIds - Starting nodes
   * @returns {Array|null} Sorted array of node IDs, or null if cycle detected
   */
  static topologicalSort(adjList, rootIds) {
    const visited = new Set();
    const result = [];
    const tempMark = new Set();
    
    const visit = (nodeId) => {
      if (tempMark.has(nodeId)) {
        return false; // Cycle detected
      }
      
      if (visited.has(nodeId)) {
        return true;
      }
      
      tempMark.add(nodeId);
      
      if (adjList[nodeId]) {
        for (const child of adjList[nodeId]) {
          if (!visit(child)) {
            return false;
          }
        }
      }
      
      tempMark.delete(nodeId);
      visited.add(nodeId);
      result.push(nodeId);
      return true;
    };
    
    // Visit all nodes starting from roots
    for (const rootId of rootIds) {
      if (!visit(rootId)) {
        return null; // Cycle detected
      }
    }
    
    return result.reverse();
  }
  
  /**
   * Check if adding an edge would create a cycle
   * @param {Object} adjList - Current adjacency list
   * @param {String} sourceId - Source node ID
   * @param {String} targetId - Target node ID
   * @returns {Boolean} True if cycle would be created
   */
  static wouldCreateCycle(adjList, sourceId, targetId) {
    // Check if targetId is an ancestor of sourceId
    const ancestors = this.findAncestors(
      this.buildReverseAdjacencyList(
        Object.keys(adjList).map(id => ({ nodeId: id })),
        Object.entries(adjList).flatMap(([src, targets]) => 
          targets.map(tgt => ({ sourceId: src, targetId: tgt, isDeleted: false }))
        )
      ),
      sourceId
    );
    
    return ancestors.has(targetId);
  }
  
  /**
   * Get connected components (for fragmented graphs)
   * @param {Array} nodes - Array of node objects
   * @param {Object} adjList - Adjacency list
   * @returns {Array} Array of components, each component is array of node IDs
   */
  static getConnectedComponents(nodes, adjList) {
    const visited = new Set();
    const components = [];
    
    const dfs = (nodeId, component) => {
      visited.add(nodeId);
      component.push(nodeId);
      
      if (adjList[nodeId]) {
        for (const neighbor of adjList[nodeId]) {
          if (!visited.has(neighbor)) {
            dfs(neighbor, component);
          }
        }
      }
    };
    
    nodes.forEach(node => {
      if (!visited.has(node.nodeId) && !node.isDeleted) {
        const component = [];
        dfs(node.nodeId, component);
        components.push(component);
      }
    });
    
    return components;
  }
  
  /**
   * Calculate graph statistics
   * @param {Array} nodes - Array of node objects
   * @param {Array} edges - Array of edge objects
   * @returns {Object} Statistics object
   */
  static calculateStats(nodes, edges) {
    const activeNodes = nodes.filter(n => !n.isDeleted);
    const activeEdges = edges.filter(e => !e.isDeleted);
    
    const adjList = this.buildAdjacencyList(activeNodes, activeEdges);
    const reverseAdjList = this.buildReverseAdjacencyList(activeNodes, activeEdges);
    const rootIds = this.findRootNodes(activeNodes, reverseAdjList);
    
    return {
      totalNodes: activeNodes.length,
      totalEdges: activeEdges.length,
      rootNodes: rootIds.length,
      orphanedNodes: this.findOrphanedNodes(activeNodes, adjList, rootIds).length,
      maxDepth: Math.max(...Object.values(this.calculateDepths(adjList, rootIds)), 0),
      hasCycles: this.detectCycle(adjList) !== null,
      components: this.getConnectedComponents(activeNodes, adjList).length
    };
  }
}

module.exports = GraphHelpers;