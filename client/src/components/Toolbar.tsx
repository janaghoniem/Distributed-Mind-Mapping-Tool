// client/src/components/Toolbar.tsx
import React, { useState } from 'react';
import { useMindMapStore } from '../store/useMindMapStore';
import CustomTitle from './CustomTitle';
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

// NOTE: You must install and import a library like 'html-to-image' for this export function to work.
import * as htmlToImage from 'html-to-image'; 

// Available node shapes
const SHAPES = ['circle', 'rectangle'] as const;

const Toolbar: React.FC = () => {
  const {
    connectMode,
    history,
    historyIndex,
    viewState,
    mapName,
    canvasRef,
    addNode,
    setMapName,
    setConnectMode,
    undo,
    redo,
    setViewState,
    resetView,
    autoLayoutNodes
  } = useMindMapStore();

  const [isShapeMenuOpen, setIsShapeMenuOpen] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [selectedShape, setSelectedShape] = useState<'circle' | 'rectangle'>('circle');
// In Toolbar.tsx, find the resetView button and replace its onClick:

const handleResetView = () => {
  const confirmed = window.confirm(
    'Reset view to default position and zoom?\n\n' +
    'Note: This only resets the camera view, not your nodes.'
  );
  
  if (confirmed) {
    resetView();
  }
};

// Then update the button:
<button
  onClick={handleResetView}  // ← Change from resetView to handleResetView
  className="p-2 hover:bg-gray-100 rounded transition-colors"
  title="Reset View (R)"
  aria-label="Reset view"
>
  <RotateCcw size={20} />
</button>
  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  const handleZoomIn = () => {
    setViewState({ zoom: Math.min(viewState.zoom + 0.1, 2) });
  };

  const handleZoomOut = () => {
    setViewState({ zoom: Math.max(viewState.zoom - 0.1, 0.5) });
  };
  
  const handleAddNode = (shape: 'circle' | 'rectangle') => {
    addNode(undefined, shape);
    setSelectedShape(shape);
    setIsShapeMenuOpen(false);
  };
  
  const handleSave = async () => {
    if (!canvasRef?.current) {
      console.error("SVG canvas reference is missing for export.");
      alert("Cannot save: Mind Map canvas is not available.");
      return;
    }

    try {
        const svgElement = canvasRef.current;
        
        const dataUrl = await htmlToImage.toPng(svgElement as unknown as HTMLElement);

        const link = document.createElement('a');
        link.download = `${mapName || 'mind-map'}.png`;
        link.href = dataUrl;
        link.click();
        
    } catch (error) {
      console.error('Error during PNG export:', error);
      alert("Failed to export PNG. Check console for details.");
    }
  };

  const handleTitleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsEditingTitle(false);
    // Trim and update only if the map name has changed and is not empty
    if (e.target.value.trim() !== mapName && e.target.value.trim() !== '') {
      setMapName(e.target.value.trim());
    }
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
    // Prevent global shortcuts while editing the title
    e.stopPropagation(); 
  };

  return (
    <div className="absolute top-15 left-4 bg-white rounded-lg shadow-lg p-2 flex gap-2 items-center">
      
      {/* 1. Editable Title Field */}
      <div className="relative flex items-center h-8">
        <CustomTitle />
        {isEditingTitle || mapName === 'Untitled Map' ? (
          <input
            type="text"
            value={mapName}
            onChange={(e) => setMapName(e.target.value)}
            onBlur={handleTitleBlur}
            onKeyDown={handleTitleKeyDown}
            autoFocus
            className="text-base font-semibold border-2 border-transparent hover:border-black focus:border-black rounded px-2 py-1 w-64 transition-all outline-none focus:ring-0"
            aria-label="Edit map name"
          />
        ) : (
          <h1
            className="text-base font-semibold border-2 border-transparent px-2 py-1 w-40 cursor-text transition-colors hover:border-black rounded"
            onClick={() => setIsEditingTitle(true)}
            onDoubleClick={() => setIsEditingTitle(true)} // Allow double-click to edit
            title="Click to edit name"
          >
            {mapName}
          </h1>
        )}
      </div>

      <div className="w-px bg-gray-300" />

      {/* 2. Add Node Button with Hover Submenu */}
      <div 
        className="relative"
        onMouseEnter={() => setIsShapeMenuOpen(true)}
        onMouseLeave={() => setIsShapeMenuOpen(false)}
      >
        <button
          onClick={() => handleAddNode(selectedShape)} 
          // MODIFIED: Changed from bg-blue-500/text-white to transparent/hover style
          className="p-2 hover:bg-gray-100 rounded transition-colors"
          title={`Add Node (${selectedShape} - N)`}
          aria-label={`Add Node (${selectedShape})`}
        >
          <Plus size={20} />
        </button>

        {isShapeMenuOpen && (
          <div 
            className="absolute left-0 mt-1 bg-white rounded-lg shadow-xl py-1 w-32 ring-1 ring-gray-900 ring-opacity-5 z-10"
            onMouseEnter={() => setIsShapeMenuOpen(true)}
            onMouseLeave={() => setIsShapeMenuOpen(false)}
          >
            <span className="block px-4 py-1 text-xs text-gray-500">Node Shape</span>
            {SHAPES.map(shape => (
              <button
                key={shape}
                onClick={() => handleAddNode(shape)}
                className={`w-full text-left px-4 py-2 hover:bg-gray-100 capitalize ${selectedShape === shape ? 'font-bold text-blue-600' : ''}`}
              >
                {shape}
              </button>
            ))}
          </div>
        )}
      </div>

      <button
        onClick={() => setConnectMode(!connectMode)}
        className={`p-2 rounded transition-colors ${connectMode ? 'bg-red-500 text-white hover:bg-red-600' : 'hover:bg-gray-100'}`}
        title={`Connection Mode (${connectMode ? 'Active' : 'Inactive'} - C)`}
        aria-label="Toggle connection mode"
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

      {/* <button
        onClick={autoLayoutNodes}
        className="p-2 hover:bg-gray-100 rounded transition-colors"
        title="Auto Layout"
        aria-label="Auto layout nodes"
      >
        <RotateCcw size={20} /> 
      </button> */}
      
      <div className="w-px bg-gray-300" />

      {/* 3. Save Button */}
      <button
        onClick={handleSave}
        // MODIFIED: Changed from bg-green-500/text-white to transparent/hover style
        className="p-2 hover:bg-gray-100 rounded transition-colors"
        title="Save as PNG (Full Canvas Export)"
        aria-label="Save as PNG"
      >
        <Save size={20} />
      </button>

    </div>
  );
};

export default Toolbar;