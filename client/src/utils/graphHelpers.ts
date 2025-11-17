//graophHelpers.ts
import type { Node, Edge, Position } from '../types';

/**
 * Generates a unique ID for nodes and edges
 */
export const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Returns a random color from a predefined palette
 */
export const getRandomColor = (): string => {
  const colors = [
    '#3B82F6', // blue
    '#10B981', // green
    '#F59E0B', // amber
    '#EF4444', // red
    '#8B5CF6', // purple
    '#EC4899', // pink
    '#14B8A6', // teal
    '#F97316', // orange
  ];
  return colors[Math.floor(Math.random() * colors.length)];
};

/**
 * Detects if adding an edge would create a cycle in the graph
 * Uses DFS with recursion stack
 */
export const hasCycle = (nodes: Node[], edges: Edge[], newEdge: Edge): boolean => {
  const adjList = new Map<string, string[]>();
  
  // Build adjacency list including the new edge
  [...edges, newEdge].forEach(edge => {
    if (!adjList.has(edge.source)) {
      adjList.set(edge.source, []);
    }
    adjList.get(edge.source)!.push(edge.target);
  });

  const visited = new Set<string>();
  const recStack = new Set<string>();

  const hasCycleUtil = (nodeId: string): boolean => {
    visited.add(nodeId);
    recStack.add(nodeId);

    const neighbors = adjList.get(nodeId) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        if (hasCycleUtil(neighbor)) return true;
      } else if (recStack.has(neighbor)) {
        return true;
      }
    }

    recStack.delete(nodeId);
    return false;
  };

  // Check all nodes for cycles
  for (const node of nodes) {
    if (!visited.has(node.id)) {
      if (hasCycleUtil(node.id)) return true;
    }
  }

  return false;
};

/**
 * Arranges nodes in a circular layout
 */
export const autoLayout = (nodes: Node[], center: Position = { x: 400, y: 300 }): Node[] => {
  if (nodes.length === 0) return nodes;
  if (nodes.length === 1) {
    return [{
      ...nodes[0],
      position: center
    }];
  }

  const radius = Math.max(200, nodes.length * 30);
  const angleStep = (2 * Math.PI) / nodes.length;
  
  return nodes.map((node, i) => ({
    ...node,
    position: {
      x: center.x + radius * Math.cos(i * angleStep),
      y: center.y + radius * Math.sin(i * angleStep)
    }
  }));
};

/**
 * Finds orphan nodes (nodes with no edges)
 */
export const findOrphanNodes = (nodes: Node[], edges: Edge[]): Node[] => {
  const connectedNodeIds = new Set<string>();
  edges.forEach(edge => {
    connectedNodeIds.add(edge.source);
    connectedNodeIds.add(edge.target);
  });

  return nodes.filter(node => !connectedNodeIds.has(node.id));
};

/**
 * Validates that an edge connects two existing nodes
 */
export const isValidEdge = (edge: Edge, nodes: Node[]): boolean => {
  const nodeIds = new Set(nodes.map(n => n.id));
  return nodeIds.has(edge.source) && nodeIds.has(edge.target);
};

/**
 * Calculates distance between two positions
 */
export const getDistance = (pos1: Position, pos2: Position): number => {
  const dx = pos2.x - pos1.x;
  const dy = pos2.y - pos1.y;
  return Math.sqrt(dx * dx + dy * dy);
};

/**
 * Finds the nearest node to a given position
 */
export const findNearestNode = (position: Position, nodes: Node[]): Node | null => {
  if (nodes.length === 0) return null;

  let nearest = nodes[0];
  let minDistance = getDistance(position, nodes[0].position);

  for (let i = 1; i < nodes.length; i++) {
    const distance = getDistance(position, nodes[i].position);
    if (distance < minDistance) {
      minDistance = distance;
      nearest = nodes[i];
    }
  }

  return nearest;
};

/**
 * Normalizes edge (ensures consistent source/target ordering)
 */
export const normalizeEdge = (edge: Edge): Edge => {
  if (edge.source > edge.target) {
    return {
      ...edge,
      source: edge.target,
      target: edge.source
    };
  }
  return edge;
};