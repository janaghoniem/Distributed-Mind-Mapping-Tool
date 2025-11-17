// server/src/utils/layoutEngine.js
const GraphHelpers = require('./graphHelpers');

/**
 * Layout Engine for automatic node positioning
 */
class LayoutEngine {
  
  /**
   * Apply hierarchical tree layout (top-down)
   * @param {Array} nodes - Array of node objects
   * @param {Array} edges - Array of edge objects
   * @param {Object} options - Layout options
   * @returns {Object} Map of nodeId to new position { x, y }
   */
  static hierarchicalLayout(nodes, edges, options = {}) {
    const {
      horizontalSpacing = 200,  // Space between siblings
      verticalSpacing = 150,    // Space between levels
      startX = 400,             // Starting X position
      startY = 50               // Starting Y position
    } = options;
    
    const adjList = GraphHelpers.buildAdjacencyList(nodes, edges);
    const reverseAdjList = GraphHelpers.buildReverseAdjacencyList(nodes, edges);
    const rootIds = GraphHelpers.findRootNodes(nodes, reverseAdjList);
    
    const positions = {};
    const levelWidths = {}; // Track used width at each level
    
    // BFS to assign positions level by level
    const queue = rootIds.map(id => ({ 
      id, 
      depth: 0, 
      x: startX + rootIds.indexOf(id) * horizontalSpacing * 2 
    }));
    
    while (queue.length > 0) {
      const { id, depth, x } = queue.shift();
      
      // Initialize level tracking
      if (!levelWidths[depth]) {
        levelWidths[depth] = startX;
      }
      
      // Calculate position
      const y = startY + depth * verticalSpacing;
      positions[id] = { x: x || levelWidths[depth], y };
      
      // Update level width
      levelWidths[depth] = Math.max(levelWidths[depth], positions[id].x + horizontalSpacing);
      
      // Add children to queue
      if (adjList[id]) {
        const children = adjList[id];
        const childStartX = positions[id].x - ((children.length - 1) * horizontalSpacing) / 2;
        
        children.forEach((childId, idx) => {
          queue.push({
            id: childId,
            depth: depth + 1,
            x: childStartX + idx * horizontalSpacing
          });
        });
      }
    }
    
    return positions;
  }
  
  /**
   * Apply force-directed layout (Fruchterman-Reingold algorithm)
   * @param {Array} nodes - Array of node objects
   * @param {Array} edges - Array of edge objects
   * @param {Object} options - Layout options
   * @returns {Object} Map of nodeId to new position { x, y }
   */
  static forceDirectedLayout(nodes, edges, options = {}) {
    const {
      iterations = 50,
      width = 1200,
      height = 800,
      repulsiveForce = 100,
      attractiveForce = 0.01,
      damping = 0.9
    } = options;
    
    // Initialize positions randomly if not set
    const positions = {};
    const velocities = {};
    
    nodes.forEach(node => {
      positions[node.nodeId] = {
        x: node.position?.x || Math.random() * width,
        y: node.position?.y || Math.random() * height
      };
      velocities[node.nodeId] = { x: 0, y: 0 };
    });
    
    const adjList = GraphHelpers.buildAdjacencyList(nodes, edges);
    
    // Run simulation
    for (let iter = 0; iter < iterations; iter++) {
      const forces = {};
      
      // Initialize forces
      nodes.forEach(node => {
        forces[node.nodeId] = { x: 0, y: 0 };
      });
      
      // Repulsive forces between all pairs
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const node1 = nodes[i];
          const node2 = nodes[j];
          
          const dx = positions[node2.nodeId].x - positions[node1.nodeId].x;
          const dy = positions[node2.nodeId].y - positions[node1.nodeId].y;
          const distance = Math.sqrt(dx * dx + dy * dy) || 1;
          
          const force = repulsiveForce / (distance * distance);
          const fx = (dx / distance) * force;
          const fy = (dy / distance) * force;
          
          forces[node1.nodeId].x -= fx;
          forces[node1.nodeId].y -= fy;
          forces[node2.nodeId].x += fx;
          forces[node2.nodeId].y += fy;
        }
      }
      
      // Attractive forces for connected nodes
      edges.forEach(edge => {
        if (edge.isDeleted) return;
        
        const pos1 = positions[edge.sourceId];
        const pos2 = positions[edge.targetId];
        
        if (!pos1 || !pos2) return;
        
        const dx = pos2.x - pos1.x;
        const dy = pos2.y - pos1.y;
        const distance = Math.sqrt(dx * dx + dy * dy) || 1;
        
        const force = attractiveForce * distance;
        const fx = (dx / distance) * force;
        const fy = (dy / distance) * force;
        
        forces[edge.sourceId].x += fx;
        forces[edge.sourceId].y += fy;
        forces[edge.targetId].x -= fx;
        forces[edge.targetId].y -= fy;
      });
      
      // Update positions with damping
      nodes.forEach(node => {
        velocities[node.nodeId].x = (velocities[node.nodeId].x + forces[node.nodeId].x) * damping;
        velocities[node.nodeId].y = (velocities[node.nodeId].y + forces[node.nodeId].y) * damping;
        
        positions[node.nodeId].x += velocities[node.nodeId].x;
        positions[node.nodeId].y += velocities[node.nodeId].y;
        
        // Keep within bounds
        positions[node.nodeId].x = Math.max(50, Math.min(width - 50, positions[node.nodeId].x));
        positions[node.nodeId].y = Math.max(50, Math.min(height - 50, positions[node.nodeId].y));
      });
    }
    
    return positions;
  }
  
  /**
   * Apply simple grid layout
   * @param {Array} nodes - Array of node objects
   * @param {Object} options - Layout options
   * @returns {Object} Map of nodeId to new position { x, y }
   */
  static gridLayout(nodes, options = {}) {
    const {
      columns = 5,
      cellWidth = 200,
      cellHeight = 150,
      startX = 100,
      startY = 100
    } = options;
    
    const positions = {};
    
    nodes.forEach((node, idx) => {
      const row = Math.floor(idx / columns);
      const col = idx % columns;
      
      positions[node.nodeId] = {
        x: startX + col * cellWidth,
        y: startY + row * cellHeight
      };
    });
    
    return positions;
  }
  
  /**
   * Apply radial layout (circular)
   * @param {Array} nodes - Array of node objects
   * @param {Array} edges - Array of edge objects
   * @param {Object} options - Layout options
   * @returns {Object} Map of nodeId to new position { x, y }
   */
  static radialLayout(nodes, edges, options = {}) {
    const {
      centerX = 600,
      centerY = 400,
      radius = 300,
      layers = 3
    } = options;
    
    const adjList = GraphHelpers.buildAdjacencyList(nodes, edges);
    const reverseAdjList = GraphHelpers.buildReverseAdjacencyList(nodes, edges);
    const rootIds = GraphHelpers.findRootNodes(nodes, reverseAdjList);
    const depths = GraphHelpers.calculateDepths(adjList, rootIds);
    
    const positions = {};
    const levelNodes = {};
    
    // Group nodes by depth
    nodes.forEach(node => {
      const depth = depths[node.nodeId] ?? 0;
      if (!levelNodes[depth]) levelNodes[depth] = [];
      levelNodes[depth].push(node.nodeId);
    });
    
    // Position each level
    Object.keys(levelNodes).forEach(depth => {
      const nodesAtLevel = levelNodes[depth];
      const levelRadius = radius * (parseInt(depth) + 1) / layers;
      const angleStep = (2 * Math.PI) / nodesAtLevel.length;
      
      nodesAtLevel.forEach((nodeId, idx) => {
        const angle = idx * angleStep;
        positions[nodeId] = {
          x: centerX + levelRadius * Math.cos(angle),
          y: centerY + levelRadius * Math.sin(angle)
        };
      });
    });
    
    return positions;
  }
  
  /**
   * Detect best layout for graph
   * @param {Array} nodes - Array of node objects
   * @param {Array} edges - Array of edge objects
   * @returns {String} Suggested layout type
   */
  static suggestLayout(nodes, edges) {
    const stats = GraphHelpers.calculateStats(nodes, edges);
    
    // Tree-like: use hierarchical
    if (stats.rootNodes === 1 && !stats.hasCycles) {
      return 'hierarchical';
    }
    
    // Multiple roots or cycles: use force-directed
    if (stats.hasCycles || stats.rootNodes > 1) {
      return 'force-directed';
    }
    
    // Small graph: grid is fine
    if (stats.totalNodes <= 20) {
      return 'grid';
    }
    
    // Default
    return 'force-directed';
  }
  
  /**
   * Apply suggested layout automatically
   * @param {Array} nodes - Array of node objects
   * @param {Array} edges - Array of edge objects
   * @param {Object} options - Layout options
   * @returns {Object} Map of nodeId to new position { x, y }
   */
  static autoLayout(nodes, edges, options = {}) {
    const layoutType = this.suggestLayout(nodes, edges);
    
    switch (layoutType) {
      case 'hierarchical':
        return this.hierarchicalLayout(nodes, edges, options);
      case 'force-directed':
        return this.forceDirectedLayout(nodes, edges, options);
      case 'grid':
        return this.gridLayout(nodes, options);
      case 'radial':
        return this.radialLayout(nodes, edges, options);
      default:
        return this.forceDirectedLayout(nodes, edges, options);
    }
  }
}

module.exports = LayoutEngine;