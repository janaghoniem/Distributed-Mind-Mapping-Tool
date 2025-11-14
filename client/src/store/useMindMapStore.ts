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
  
  // Node actions
  addNode: (position?: Position) => void;
  removeNode: (id: string) => void;
  updateNode: (id: string, updates: Partial<Node>) => void;
  moveNode: (id: string, position: Position) => void;
  selectNode: (id: string | null) => void;
  
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
  
  // Layout
  autoLayoutNodes: () => void;
  
  // Sync
  syncState: (nodes: Node[], edges: Edge[]) => void;
}

export const useMindMapStore = create<MindMapStore>((set, get) => ({
  // Initial state
  nodes: [
    { 
      id: '1', 
      label: 'Central Idea', 
      position: { x: 400, y: 300 }, 
      color: '#3B82F6' 
    }
  ],
  edges: [],
  selectedNodeId: null,
  connectMode: false,
  connectSourceId: null,
  history: [],
  historyIndex: -1,
  viewState: { zoom: 1, offset: { x: 0, y: 0 } },
  cursors: new Map(),

  // Node actions
  addNode: (position) => {
    const state = get();
    const newNode: Node = {
      id: generateId(),
      label: 'New Node',
      position: position || { 
        x: 400 - state.viewState.offset.x / state.viewState.zoom, 
        y: 300 - state.viewState.offset.y / state.viewState.zoom 
      },
      color: getRandomColor()
    };
    
    set({ nodes: [...state.nodes, newNode] });
    get().saveToHistory();
  },

  removeNode: (id) => {
    const state = get();
    set({
      nodes: state.nodes.filter(n => n.id !== id),
      edges: state.edges.filter(e => e.source !== id && e.target !== id),
      selectedNodeId: state.selectedNodeId === id ? null : state.selectedNodeId
    });
    get().saveToHistory();
  },

  updateNode: (id, updates) => {
    set(state => ({
      nodes: state.nodes.map(n => n.id === id ? { ...n, ...updates } : n)
    }));
    get().saveToHistory();
  },

  moveNode: (id, position) => {
    set(state => ({
      nodes: state.nodes.map(n => n.id === id ? { ...n, position } : n)
    }));
  },

  selectNode: (id) => {
    set({ selectedNodeId: id });
  },

  // Edge actions
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
    
    set({ edges: [...state.edges, newEdge] });
    get().saveToHistory();
  },

  removeEdge: (id) => {
    set(state => ({
      edges: state.edges.filter(e => e.id !== id)
    }));
    get().saveToHistory();
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
    
    // Remove any "future" history if we're not at the end
    const newHistory = history.slice(0, historyIndex + 1);
    
    // Add current state
    newHistory.push({ 
      nodes: JSON.parse(JSON.stringify(nodes)), 
      edges: JSON.parse(JSON.stringify(edges)) 
    });
    
    // Limit history to 50 states
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
    set({ nodes, edges });
    get().saveToHistory();
  }
}));