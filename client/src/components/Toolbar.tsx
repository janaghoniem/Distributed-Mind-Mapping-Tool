import React from 'react';
import { useMindMapStore } from '../store/useMindMapStore';
import {
  FiPlus as Plus,
  FiLink as LinkIcon,
  FiRotateCcw as Undo,
  FiRotateCw as Redo,
  FiZoomIn as ZoomIn,
  FiZoomOut as ZoomOut,
  FiRotateCcw as RotateCcw,
  FiSave as Save,
} from 'react-icons/fi';

const Toolbar: React.FC = () => {
  const {
    connectMode,
    history,
    historyIndex,
    viewState,
    addNode,
    setConnectMode,
    undo,
    redo,
    setViewState,
    resetView,
    autoLayoutNodes
  } = useMindMapStore();

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  const handleZoomIn = () => {
    setViewState({ zoom: Math.min(viewState.zoom + 0.1, 2) });
  };

  const handleZoomOut = () => {
    setViewState({ zoom: Math.max(viewState.zoom - 0.1, 0.5) });
  };

  return (
    <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-2 flex gap-2">
      <button
        onClick={() => addNode()}
        className="p-2 hover:bg-gray-100 rounded transition-colors"
        title="Add Node (N)"
        aria-label="Add node"
      >
        <Plus size={20} />
      </button>
      
      <button
        onClick={() => setConnectMode(!connectMode)}
        className={`p-2 rounded transition-colors ${
          connectMode ? 'bg-blue-500 text-white' : 'hover:bg-gray-100'
        }`}
        title="Connect Nodes (C)"
        aria-label="Connect mode"
      >
        <LinkIcon size={20} />
      </button>

      <div className="w-px bg-gray-300" />

      <button
        onClick={undo}
        disabled={!canUndo}
        className="p-2 hover:bg-gray-100 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        title="Undo (Ctrl+Z)"
        aria-label="Undo"
      >
        <Undo size={20} />
      </button>

      <button
        onClick={redo}
        disabled={!canRedo}
        className="p-2 hover:bg-gray-100 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        title="Redo (Ctrl+Y)"
        aria-label="Redo"
      >
        <Redo size={20} />
      </button>

      <div className="w-px bg-gray-300" />

      <button
        onClick={handleZoomIn}
        className="p-2 hover:bg-gray-100 rounded transition-colors"
        title="Zoom In (+)"
        aria-label="Zoom in"
      >
        <ZoomIn size={20} />
      </button>

      <button
        onClick={handleZoomOut}
        className="p-2 hover:bg-gray-100 rounded transition-colors"
        title="Zoom Out (-)"
        aria-label="Zoom out"
      >
        <ZoomOut size={20} />
      </button>

      <button
        onClick={resetView}
        className="p-2 hover:bg-gray-100 rounded transition-colors"
        title="Reset View (R)"
        aria-label="Reset view"
      >
        <RotateCcw size={20} />
      </button>

      <div className="w-px bg-gray-300" />

      <button
        onClick={autoLayoutNodes}
        className="p-2 hover:bg-gray-100 rounded transition-colors"
        title="Auto Layout"
        aria-label="Auto layout"
      >
        <Save size={20} />
      </button>
    </div>
  );
};

  export default Toolbar;