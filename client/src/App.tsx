import React, { useEffect } from 'react';
import { useMindMapStore } from './store/useMindMapStore';
import Toolbar from './components/Toolbar';
import MindMapCanvas from './components/MindMapCanvas';
import StatusBar from './components/StatusBar';

const App: React.FC = () => {
  useEffect(() => {
    useMindMapStore.getState().saveToHistory();
  }, []);

  return (
    <div className="w-full h-screen relative overflow-hidden">
      <Toolbar />
      <MindMapCanvas />
      <StatusBar />
      
      <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-4 max-w-xs">
        <h2 className="text-lg font-bold mb-2">Shortcuts</h2>
        <div className="text-sm text-gray-600 space-y-1">
          <p><kbd className="px-1 bg-gray-100 rounded">N</kbd> Add node</p>
          <p><kbd className="px-1 bg-gray-100 rounded">C</kbd> Connect mode</p>
          <p><kbd className="px-1 bg-gray-100 rounded">R</kbd> Reset view</p>
          <p><kbd className="px-1 bg-gray-100 rounded">Del</kbd> Delete selected</p>
          <p><kbd className="px-1 bg-gray-100 rounded">Ctrl+Z/Y</kbd> Undo/Redo</p>
          <p><kbd className="px-1 bg-gray-100 rounded">Double-click</kbd> Edit node</p>
          <p><kbd className="px-1 bg-gray-100 rounded">Scroll</kbd> Zoom</p>
        </div>
      </div>
    </div>
  );
};

export default App;