import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useMindMapStore } from '../store/useMindMapStore';
import type { Node, Edge } from '../types';

interface UseWebSocketOptions {
  url: string;
  userId: string;
  mapId?: string;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
}

export const useWebSocket = ({ url, userId, mapId, onConnect, onDisconnect, onError }: UseWebSocketOptions) => {
  const [isConnected, setIsConnected] = useState(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const socketRef = useRef<Socket | null>(null);
  const store = useMindMapStore();

  useEffect(() => {
    // Initialize socket connection
    const socket = io(url, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 10,
      query: { userId }
    });

    socketRef.current = socket;

    // Connection handlers
    socket.on('connect', () => {
      console.log('✅ WebSocket connected');
      setIsConnected(true);
      setReconnectAttempts(0);
      onConnect?.();
      
      // Join map if mapId provided
      if (mapId) {
        socket.emit('join-map', { mapId });
      }
      
      // Request initial sync
      socket.emit('sync:request', { mapId });
    });

    socket.on('disconnect', () => {
      console.log('❌ WebSocket disconnected');
      setIsConnected(false);
      onDisconnect?.();
    });

    socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      setReconnectAttempts(prev => prev + 1);
      onError?.(error);
    });

    // Sync handler - Load initial data from server
    socket.on('sync:response', (data: { nodes: Node[], edges: Edge[] }) => {
      console.log('📥 SYNC: Received', data.nodes?.length || 0, 'nodes and', data.edges?.length || 0, 'edges');
      store.syncState(data.nodes || [], data.edges || []);
    });

    // ========== REMOTE NODE OPERATIONS ==========
    
    socket.on('node:add', (data: { node: Node, userId: string }) => {
      if (data.userId !== userId) {
        console.log('📥 REMOTE: node:add', data.node.id, data.node.label);
        store.addNodeRemote(data.node);
      }
    });

    socket.on('node:remove', (data: { nodeId: string, userId: string }) => {
      if (data.userId !== userId) {
        console.log('📥 REMOTE: node:remove', data.nodeId);
        store.removeNodeRemote(data.nodeId);
      }
    });

    socket.on('node:update', (data: { nodeId: string, updates: Partial<Node>, userId: string }) => {
      if (data.userId !== userId) {
        console.log('📥 REMOTE: node:update', data.nodeId);
        store.updateNodeRemote(data.nodeId, data.updates);
      }
    });

    socket.on('node:move', (data: { nodeId: string, position: { x: number, y: number }, userId: string }) => {
      if (data.userId !== userId) {
        store.moveNodeRemote(data.nodeId, data.position);
      }
    });

    // ========== REMOTE EDGE OPERATIONS ==========
    
    socket.on('edge:add', (data: { edge?: Edge, source: string, target: string, userId: string }) => {
      if (data.userId !== userId) {
        console.log('📥 REMOTE: edge:add', `${data.source} -> ${data.target}`);
        
        // Create edge with remote data
        const edge: Edge = data.edge || {
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          source: data.source,
          target: data.target
        };
        
        store.addEdgeRemote(edge);
      }
    });

    socket.on('edge:remove', (data: { edgeId: string, userId: string }) => {
      if (data.userId !== userId) {
        console.log('📥 REMOTE: edge:remove', data.edgeId);
        store.removeEdgeRemote(data.edgeId);
      }
    });

    // ========== CURSOR UPDATES ==========
    
    socket.on('cursor:update', (data: { userId: string, position: { x: number, y: number }, color: string }) => {
      if (data.userId !== userId) {
        store.updateCursor(data.userId, {
          userId: data.userId,
          position: data.position,
          color: data.color
        });
      }
    });

    socket.on('user:left', (data: { userId: string }) => {
      console.log('👋 User left:', data.userId);
      store.removeCursor(data.userId);
    });

    // Cleanup
    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [url, userId, mapId]);

  // Emit functions
  const emit = (event: string, data: any) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, { ...data, userId });
    } else {
      console.warn('⚠️ Socket not connected, cannot emit:', event);
    }
  };

  const emitNodeAdd = (node: Node) => {
    console.log('📤 EMIT: node:add', node.id);
    emit('node:add', { node });
  };

  const emitNodeRemove = (nodeId: string) => {
    console.log('📤 EMIT: node:remove', nodeId);
    emit('node:remove', { nodeId });
  };

  const emitNodeUpdate = (nodeId: string, updates: Partial<Node>) => {
    console.log('📤 EMIT: node:update', nodeId);
    emit('node:update', { nodeId, updates });
  };

  const emitNodeMove = (nodeId: string, position: { x: number, y: number }) => {
    emit('node:move', { nodeId, position });
  };

  const emitEdgeAdd = (source: string, target: string) => {
    console.log('📤 EMIT: edge:add', `${source} -> ${target}`);
    emit('edge:add', { source, target });
  };

  const emitEdgeRemove = (edgeId: string) => {
    console.log('📤 EMIT: edge:remove', edgeId);
    emit('edge:remove', { edgeId });
  };

  const emitCursorUpdate = (position: { x: number, y: number }, color: string) => {
    emit('cursor:update', { position, color });
  };

  // Connect emit functions to store on mount
  useEffect(() => {
    if (isConnected) {
      console.log('🔗 Connecting emit functions to store');
      store.setEmitFunctions({
        emitNodeAdd,
        emitNodeRemove,
        emitNodeUpdate,
        emitNodeMove,
        emitEdgeAdd,
        emitEdgeRemove,
      });
    }
  }, [isConnected]);

  return {
    isConnected,
    reconnectAttempts,
    emitNodeAdd,
    emitNodeRemove,
    emitNodeUpdate,
    emitNodeMove,
    emitEdgeAdd,
    emitEdgeRemove,
    emitCursorUpdate
  };
};