import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useMindMapStore } from '../store/useMindMapStore';
import type { WebSocketMessage, Node, Edge } from '../types';

interface UseWebSocketOptions {
  url: string;
  userId: string;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
}

export const useWebSocket = ({ url, userId, onConnect, onDisconnect, onError }: UseWebSocketOptions) => {
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
      console.log('WebSocket connected');
      setIsConnected(true);
      setReconnectAttempts(0);
      onConnect?.();
      
      // Request initial sync
      socket.emit('sync:request');
    });

    socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
      onDisconnect?.();
    });

    socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      setReconnectAttempts(prev => prev + 1);
      onError?.(error);
    });

    // Sync handler
    socket.on('sync:response', (data: { nodes: Node[], edges: Edge[] }) => {
      console.log('Received sync data:', data);
      store.syncState(data.nodes, data.edges);
    });

    // Node operations
    socket.on('node:add', (data: { node: Node, userId: string }) => {
      if (data.userId !== userId) {
        store.addNode(data.node.position);
      }
    });

    socket.on('node:remove', (data: { nodeId: string, userId: string }) => {
      if (data.userId !== userId) {
        store.removeNode(data.nodeId);
      }
    });

    socket.on('node:update', (data: { nodeId: string, updates: Partial<Node>, userId: string }) => {
      if (data.userId !== userId) {
        store.updateNode(data.nodeId, data.updates);
      }
    });

    socket.on('node:move', (data: { nodeId: string, position: { x: number, y: number }, userId: string }) => {
      if (data.userId !== userId) {
        store.moveNode(data.nodeId, data.position);
      }
    });

    // Edge operations
    socket.on('edge:add', (data: { source: string, target: string, userId: string }) => {
      if (data.userId !== userId) {
        store.addEdge(data.source, data.target);
      }
    });

    socket.on('edge:remove', (data: { edgeId: string, userId: string }) => {
      if (data.userId !== userId) {
        store.removeEdge(data.edgeId);
      }
    });

    // Cursor updates
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
      store.removeCursor(data.userId);
    });

    // Cleanup
    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [url, userId]);

  // Emit functions
  const emit = (event: string, data: any) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, { ...data, userId });
    }
  };

  const emitNodeAdd = (node: Node) => {
    emit('node:add', { node });
  };

  const emitNodeRemove = (nodeId: string) => {
    emit('node:remove', { nodeId });
  };

  const emitNodeUpdate = (nodeId: string, updates: Partial<Node>) => {
    emit('node:update', { nodeId, updates });
  };

  const emitNodeMove = (nodeId: string, position: { x: number, y: number }) => {
    emit('node:move', { nodeId, position });
  };

  const emitEdgeAdd = (source: string, target: string) => {
    emit('edge:add', { source, target });
  };

  const emitEdgeRemove = (edgeId: string) => {
    emit('edge:remove', { edgeId });
  };

  const emitCursorUpdate = (position: { x: number, y: number }, color: string) => {
    emit('cursor:update', { position, color });
  };

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