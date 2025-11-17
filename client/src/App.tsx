import React, { useEffect, useState } from 'react';
import { useMindMapStore } from './store/useMindMapStore';
import { useWebSocket } from './hooks/useWebSocket';
import Toolbar from './components/Toolbar';
import MindMapCanvas from './components/MindMapCanvas';
import StatusBar from './components/StatusBar';

const App: React.FC = () => {
  const [userId] = useState(() => `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const [mapId] = useState('default_map'); // Use default map for now
  
  const {
    isConnected,
    reconnectAttempts,
  } = useWebSocket({
    url: 'http://localhost:3000',
    userId,
    mapId,
    onConnect: () => {
      console.log('✅ Connected to server');
    },
    onDisconnect: () => {
      console.log('❌ Disconnected from server');
    },
    onError: (error) => {
      console.error('Connection error:', error);
    }
  });

  const nodes = useMindMapStore(state => state.nodes);
  const edges = useMindMapStore(state => state.edges);

  useEffect(() => {
    useMindMapStore.getState().saveToHistory();
  }, []);

  // Debug: Log state changes
  useEffect(() => {
    console.log('📊 Current state:', { nodeCount: nodes.length, edgeCount: edges.length });
  }, [nodes.length, edges.length]);

  return (
    <div className="w-full h-screen relative overflow-hidden">
      {/* Connection Status Banner */}
      {!isConnected && (
        <div className="absolute top-0 left-0 right-0 bg-yellow-500 text-white text-center py-2 z-50">
          {reconnectAttempts > 0 ? (
            `🔄 Reconnecting... (attempt ${reconnectAttempts})`
          ) : (
            '🔄 Connecting to server...'
          )}
        </div>
      )}

      {isConnected && (
        <div className="absolute top-0 left-0 right-0 bg-green-500 text-white text-center py-2 z-50 text-sm">
          ✅ Connected • User: {userId.substring(0, 20)}... • Map: {mapId}
        </div>
      )}

      <Toolbar />
      <MindMapCanvas />
      <StatusBar />
      
      <div className="absolute top-16 right-4 bg-white rounded-lg shadow-lg p-5 max-w-xs">
        <h2 className="text-lg font-semibold mb-2">Shortcuts</h2>
        <div className="text-sm text-gray-600 space-y-1">
          <p><kbd className="px-1 bg-gray-100 rounded">N</kbd> Add node</p>
          <p><kbd className="px-1 bg-gray-100 rounded">C</kbd> Connect mode</p>
          <p><kbd className="px-1 bg-gray-100 rounded">R</kbd> Reset view</p>
          <p><kbd className="px-1 bg-gray-100 rounded">Del</kbd> Delete selected</p>
          <p><kbd className="px-1 bg-gray-100 rounded">Ctrl+Z/Y</kbd> Undo/Redo</p>
          <p><kbd className="px-1 bg-gray-100 rounded">Double-click</kbd> Edit node</p>
          <p><kbd className="px-1 bg-gray-100 rounded">Scroll</kbd> Zoom</p>
          <p><kbd className="px-1 bg-gray-100 rounded">Ctrl+Click</kbd> Pan</p>
        </div>

        {/* Debug Info */}
        <div className="mt-4 pt-4 border-t text-xs text-gray-500">
          <p>Status: <span className={isConnected ? 'text-green-600 font-semibold' : 'text-yellow-600'}>
            {isConnected ? '● Online' : '○ Connecting...'}
          </span></p>
          <p>Nodes: <span className="font-mono">{nodes.length}</span></p>
          <p>Edges: <span className="font-mono">{edges.length}</span></p>
          {reconnectAttempts > 0 && (
            <p className="text-yellow-600">Reconnect: {reconnectAttempts}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;