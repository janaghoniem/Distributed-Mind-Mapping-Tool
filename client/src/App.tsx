import React, { useEffect, useState } from 'react';
import { useMindMapStore } from './store/useMindMapStore';
import { useWebSocket } from './hooks/useWebSocket';
import Toolbar from './components/Toolbar';
import MindMapCanvas from './components/MindMapCanvas';
import StatusBar from './components/StatusBar';

const App: React.FC = () => {
  const [userId] = useState(() => `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const [mapId] = useState('default_map');
  
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

  useEffect(() => {
    console.log('📊 Current state:', { nodeCount: nodes.length, edgeCount: edges.length });
  }, [nodes.length, edges.length]);

  return (
    <div className="w-full h-screen relative overflow-hidden">
      {/* Connection Status Banner - More Aesthetic Version */}
      
      {/* Connecting/Reconnecting State - Soft Yellow/Amber */}
      {!isConnected && (
        <div className="absolute top-0 left-0 right-0 bg-amber-50 border-b border-amber-200 text-amber-800 text-center py-2 z-50 text-sm backdrop-blur-sm bg-opacity-95">
          <div className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-4 w-4 text-amber-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="font-medium">
              {reconnectAttempts > 0 ? (
                `Reconnecting... (attempt ${reconnectAttempts})`
              ) : (
                'Connecting to server...'
              )}
            </span>
          </div>
        </div>
      )}

      {/* Connected State - Soft Green/Emerald */}
      {isConnected && (
        <div className="absolute top-0 left-0 right-0 bg-emerald-50 border-b border-emerald-200 text-emerald-800 text-center py-2 z-50 text-sm backdrop-blur-sm bg-opacity-95">
          <div className="flex items-center justify-center gap-2">
            <div className="flex items-center gap-1.5">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="font-medium">Connected</span>
            </div>
            <span className="text-emerald-600">•</span>
            <span className="text-emerald-700 font-mono text-xs">
              User: {userId.substring(0, 20)}...
            </span>
            <span className="text-emerald-600">•</span>
            <span className="text-emerald-700 font-mono text-xs">
              Map: {mapId}
            </span>
          </div>
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
          <p>Status: <span className={isConnected ? 'text-emerald-600 font-semibold' : 'text-amber-600 font-semibold'}>
            {isConnected ? '● Online' : '○ Connecting...'}
          </span></p>
          <p>Nodes: <span className="font-mono">{nodes.length}</span></p>
          <p>Edges: <span className="font-mono">{edges.length}</span></p>
          {reconnectAttempts > 0 && (
            <p className="text-amber-600">Reconnect: {reconnectAttempts}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;