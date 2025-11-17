import { create } from 'zustand';
import type { Node, Edge, Position, ViewState, HistoryState, Cursor } from '../types';
import { generateId, getRandomColor, hasCycle, autoLayout } from '../utils/graphHelpers';

interface MindMapStore {
  // State
  nodes: Node[];
  edges: Edge[];
  selectedNodeId: string | null;
  connectMode: boolean;
  connectSourceId: string | null;
  history: HistoryState[];
  historyIndex: number;
  viewState: ViewState;
  cursors: Map<string, Cursor>;
  mapName: string;
  canvasRef: React.RefObject<SVGSVGElement> | null;
  
  // WebSocket emit functions
  emitNodeAdd: ((node: Node) => void) | null;
  emitNodeRemove: ((nodeId: string) => void) | null;
  emitNodeUpdate: ((nodeId: string, updates: Partial<Node>) => void) | null;
  emitNodeMove: ((nodeId: string, position: Position) => void) | null;
  emitEdgeAdd: ((source: string, target: string) => void) | null;
  emitEdgeRemove: ((edgeId: string) => void) | null;

  // Node actions (local + emit)
  addNode: (position?: Position, shape?: Node['shape']) => void;
  removeNode: (id: string) => void;
  updateNode: (id: string, updates: Partial<Node>) => void;
  moveNode: (id: string, position: Position) => void;
  selectNode: (id: string | null) => void;
  
  // Remote actions (no emit)
  addNodeRemote: (node: Node) => void;
  removeNodeRemote: (id: string) => void;
  updateNodeRemote: (id: string, updates: Partial<Node>) => void;
  moveNodeRemote: (id: string, position: Position) => void;
  addEdgeRemote: (edge: Edge) => void;
  removeEdgeRemote: (id: string) => void;
  
  // Edge actions
  addEdge: (source: string, target: string) => void;
  removeEdge: (id: string) => void;
  
  // Connection mode
  setConnectMode: (enabled: boolean) => void;
  setConnectSource: (id: string | null) => void;
  
  // History
  undo: () => void;
  redo: () => void;
  saveToHistory: () => void;
  
  // View
  setViewState: (viewState: Partial<ViewState>) => void;
  resetView: () => void;
  
  // Collaboration
  updateCursor: (userId: string, cursor: Cursor) => void;
  removeCursor: (userId: string) => void;

  // Map actions
  setMapName: (name: string) => void; 
  setCanvasRef: (ref: React.RefObject<SVGSVGElement | null>) => void;
  
  // Layout
  autoLayoutNodes: () => void;
  
  // Sync
  syncState: (nodes: Node[], edges: Edge[]) => void;
  
  // Set WebSocket emit functions
  setEmitFunctions: (emitFuncs: {
    emitNodeAdd: (node: Node) => void;
    emitNodeRemove: (nodeId: string) => void;
    emitNodeUpdate: (nodeId: string, updates: Partial<Node>) => void;
    emitNodeMove: (nodeId: string, position: Position) => void;
    emitEdgeAdd: (source: string, target: string) => void;
    emitEdgeRemove: (edgeId: string) => void;
  }) => void;
}

export const useMindMapStore = create<MindMapStore>((set, get) => ({
  // Initial state - EMPTY (no hardcoded nodes)
  nodes: [],
  edges: [],
  selectedNodeId: null,
  connectMode: false,
  connectSourceId: null,
  history: [],
  historyIndex: -1,
  viewState: { zoom: 1, offset: { x: 0, y: 0 } },
  cursors: new Map(),
  mapName: 'Untitled',
  canvasRef: null,
  
  // WebSocket emit functions (initially null)
  emitNodeAdd: null,
  emitNodeRemove: null,
  emitNodeUpdate: null,
  emitNodeMove: null,
  emitEdgeAdd: null,
  emitEdgeRemove: null,

  // ========== LOCAL ACTIONS (with emit) ==========
  
  addNode: (position, shape = 'circle') => { 
    const { viewState, emitNodeAdd } = get();
    const centerX = (window.innerWidth / 2 - viewState.offset.x) / viewState.zoom;
    const centerY = (window.innerHeight / 2 - viewState.offset.y) / viewState.zoom;
    
    const newNode: Node = {
      id: generateId(),
      label: 'New Node',
      position: position || { x: centerX, y: centerY },
      color: getRandomColor(),
      shape: shape,
    };

    console.log('🔵 LOCAL: Adding node', newNode.id);

    set(state => ({
      nodes: [...state.nodes, newNode],
      selectedNodeId: newNode.id,
    }));
    
    // Emit to other clients
    emitNodeAdd?.(newNode);
    
    get().saveToHistory();
  },
  
  removeNode: (id) => {
    const state = get();
    
    console.log('🔵 LOCAL: Removing node', id);
    
    set({
      nodes: state.nodes.filter(n => n.id !== id),
      edges: state.edges.filter(e => e.source !== id && e.target !== id),
      selectedNodeId: state.selectedNodeId === id ? null : state.selectedNodeId
    });
    
    // Emit to other clients
    state.emitNodeRemove?.(id);
    
    get().saveToHistory();
  },

  updateNode: (id, updates) => {
    const { emitNodeUpdate } = get();
    
    console.log('🔵 LOCAL: Updating node', id);
    
    set(state => ({
      nodes: state.nodes.map(n => n.id === id ? { ...n, ...updates } : n)
    }));
    
    // Emit to other clients
    emitNodeUpdate?.(id, updates);
    
    get().saveToHistory();
  },

  moveNode: (id, position) => {
    const { emitNodeMove } = get();
    
    set(state => ({
      nodes: state.nodes.map(n => n.id === id ? { ...n, position } : n)
    }));
    
    // Emit to other clients
    emitNodeMove?.(id, position);
  },

  addEdge: (source, target) => {
    const state = get();
    
    // Prevent self-loops
    if (source === target) {
      console.warn('Cannot create self-loop');
      return;
    }
    
    // Prevent duplicate edges
    const edgeExists = state.edges.some(
      e => (e.source === source && e.target === target) || 
           (e.source === target && e.target === source)
    );
    
    if (edgeExists) {
      console.warn('Edge already exists');
      return;
    }
    
    const newEdge: Edge = {
      id: generateId(),
      source,
      target
    };
    
    // Check for cycles
    if (hasCycle(state.nodes, state.edges, newEdge)) {
      alert('Cannot add edge: would create a cycle');
      return;
    }
    
    console.log('🔵 LOCAL: Adding edge', newEdge.id);
    
    set({ edges: [...state.edges, newEdge] });
    
    // Emit to other clients
    state.emitEdgeAdd?.(source, target);
    
    get().saveToHistory();
  },

  removeEdge: (id) => {
    const { emitEdgeRemove } = get();
    
    console.log('🔵 LOCAL: Removing edge', id);
    
    set(state => ({
      edges: state.edges.filter(e => e.id !== id)
    }));
    
    // Emit to other clients
    emitEdgeRemove?.(id);
    
    get().saveToHistory();
  },

  // ========== REMOTE ACTIONS (no emit, no history) ==========
  
  addNodeRemote: (node: Node) => {
    console.log('🟢 REMOTE: Adding node', node.id);
    
    set(state => {
      // Check if node already exists
      const exists = state.nodes.some(n => n.id === node.id);
      if (exists) {
        console.warn('Node already exists, skipping:', node.id);
        return state;
      }
      
      return {
        nodes: [...state.nodes, node]
      };
    });
  },
  
  removeNodeRemote: (id: string) => {
    console.log('🟢 REMOTE: Removing node', id);
    
    set(state => ({
      nodes: state.nodes.filter(n => n.id !== id),
      edges: state.edges.filter(e => e.source !== id && e.target !== id),
    }));
  },
  
  updateNodeRemote: (id: string, updates: Partial<Node>) => {
    console.log('🟢 REMOTE: Updating node', id);
    
    set(state => ({
      nodes: state.nodes.map(n => n.id === id ? { ...n, ...updates } : n)
    }));
  },
  
  moveNodeRemote: (id: string, position: Position) => {
    set(state => ({
      nodes: state.nodes.map(n => n.id === id ? { ...n, position } : n)
    }));
  },
  
  addEdgeRemote: (edge: Edge) => {
    console.log('🟢 REMOTE: Adding edge', edge.id);
    
    set(state => {
      // Check if edge already exists
      const exists = state.edges.some(e => e.id === edge.id);
      if (exists) {
        console.warn('Edge already exists, skipping:', edge.id);
        return state;
      }
      
      return {
        edges: [...state.edges, edge]
      };
    });
  },
  
  removeEdgeRemote: (id: string) => {
    console.log('🟢 REMOTE: Removing edge', id);
    
    set(state => ({
      edges: state.edges.filter(e => e.id !== id)
    }));
  },

  selectNode: (id) => {
    set({ selectedNodeId: id });
  },

  // Connection mode
  setConnectMode: (enabled) => {
    set({ 
      connectMode: enabled, 
      connectSourceId: enabled ? null : get().connectSourceId 
    });
  },

  setConnectSource: (id) => {
    set({ connectSourceId: id });
  },

  // Map/Canvas actions
  setMapName: (mapName: string) => set({ mapName }),
  setCanvasRef: (ref) => set({ canvasRef: ref as React.RefObject<SVGSVGElement> | null }),
  
  // History management
  undo: () => {
    const { history, historyIndex } = get();
    if (historyIndex > 0) {
      const prevState = history[historyIndex - 1];
      set({
        nodes: prevState.nodes,
        edges: prevState.edges,
        historyIndex: historyIndex - 1
      });
    }
  },

  redo: () => {
    const { history, historyIndex } = get();
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1];
      set({
        nodes: nextState.nodes,
        edges: nextState.edges,
        historyIndex: historyIndex + 1
      });
    }
  },

  saveToHistory: () => {
    const { nodes, edges, history, historyIndex } = get();
    
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push({ 
      nodes: JSON.parse(JSON.stringify(nodes)), 
      edges: JSON.parse(JSON.stringify(edges)) 
    });
    
    if (newHistory.length > 50) {
      newHistory.shift();
    }
    
    set({
      history: newHistory,
      historyIndex: newHistory.length - 1
    });
  },

  // View management
  setViewState: (newViewState) => {
    set(state => ({
      viewState: { ...state.viewState, ...newViewState }
    }));
  },

  resetView: () => {
    set({ viewState: { zoom: 1, offset: { x: 0, y: 0 } } });
  },

  // Collaboration
  updateCursor: (userId, cursor) => {
    set(state => {
      const newCursors = new Map(state.cursors);
      newCursors.set(userId, cursor);
      return { cursors: newCursors };
    });
  },

  removeCursor: (userId) => {
    set(state => {
      const newCursors = new Map(state.cursors);
      newCursors.delete(userId);
      return { cursors: newCursors };
    });
  },

  // Layout
  autoLayoutNodes: () => {
    const state = get();
    const centerX = 400 - state.viewState.offset.x / state.viewState.zoom;
    const centerY = 300 - state.viewState.offset.y / state.viewState.zoom;
    
    set({
      nodes: autoLayout(state.nodes, { x: centerX, y: centerY })
    });
    get().saveToHistory();
  },

  // Sync from server
  syncState: (nodes, edges) => {
    console.log('🔄 SYNC: Received', nodes.length, 'nodes and', edges.length, 'edges');
    set({ nodes, edges });
    get().saveToHistory();
  },
  
  // Set WebSocket emit functions
  setEmitFunctions: (emitFuncs) => {
    set({
      emitNodeAdd: emitFuncs.emitNodeAdd,
      emitNodeRemove: emitFuncs.emitNodeRemove,
      emitNodeUpdate: emitFuncs.emitNodeUpdate,
      emitNodeMove: emitFuncs.emitNodeMove,
      emitEdgeAdd: emitFuncs.emitEdgeAdd,
      emitEdgeRemove: emitFuncs.emitEdgeRemove,
    });
  }
}));