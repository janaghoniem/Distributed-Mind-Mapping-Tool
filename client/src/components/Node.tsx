import React, { useRef, useState, useMemo, useEffect } from 'react';
import { useMindMapStore } from '../store/useMindMapStore';
import type { Node as MindNode } from '../types';
import { getRandomColor } from '../utils/graphHelpers';

// --- Global Constants for the Menu ---
const COLOR_PALETTE = [
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#14B8A6', // Teal
  '#F97316', // Orange
  '#334155', // Slate
];
const SHAPES = ['circle', 'rectangle'] as const;
// -------------------------------------

const Node: React.FC<{ node: MindNode }> = ({ node }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [label, setLabel] = useState(node.label);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [isColorMenuOpen, setIsColorMenuOpen] = useState(false); // Submenu state
  const [isShapeMenuOpen, setIsShapeMenuOpen] = useState(false); // Submenu state
  const inputRef = useRef<HTMLInputElement>(null);
  
  const {
    selectedNodeId,
    connectMode,
    connectSourceId,
    updateNode,
    moveNode,
    selectNode,
    removeNode,
    addEdge,
    setConnectSource
  } = useMindMapStore();

  const isSelected = selectedNodeId === node.id;
  const isConnectSource = connectSourceId === node.id;

  // --- Context Menu Handlers ---
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    selectNode(node.id);
    setMenuPosition({ x: e.clientX, y: e.clientY });
    setIsMenuOpen(true);
    // Reset submenus when main menu opens
    setIsColorMenuOpen(false);
    setIsShapeMenuOpen(false);
  };
  
  // Closes menu on any global click outside the menu
  const handleGlobalClick = useMemo(() => () => {
    if (isMenuOpen) {
      setIsMenuOpen(false);
    }
  }, [isMenuOpen]);

  useEffect(() => {
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, [handleGlobalClick]);

  const handleDelete = () => {
    removeNode(node.id);
    setIsMenuOpen(false);
  };

  const handleRename = () => {
    setIsEditing(true);
    setIsMenuOpen(false);
  };

  const handleRecolor = (color: string) => {
    updateNode(node.id, { color });
    setIsMenuOpen(false);
  };

  const handleChangeShape = (shape: MindNode['shape']) => {
    updateNode(node.id, { shape });
    setIsMenuOpen(false);
  };

  // --- NEW: Text Formatting Handlers ---
  const handleFormat = (style: 'bold' | 'italic' | 'underline') => {
    // Requires 'textStyle' property on the Node interface
    const currentStyle = node.textStyle || { bold: false, italic: false, underline: false };
    updateNode(node.id, { textStyle: { ...currentStyle, [style]: !currentStyle[style] } });
  };
  // ------------------------------------

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isEditing) return;
    if (e.button === 1 || e.button === 2) return; 
    
    if (!connectMode) {
      e.preventDefault(); 
    }

    e.stopPropagation();
    selectNode(node.id);

    if (connectMode) {
      if (!connectSourceId) {
        setConnectSource(node.id);
      } else if (connectSourceId !== node.id) {
        addEdge(connectSourceId, node.id);
        setConnectSource(null);
      }
      return;
    }

    const startX = e.clientX;
    const startY = e.clientY;
    const startPos = { x: node.position.x, y: node.position.y };

    const handleMouseMove = (e: MouseEvent) => {
      moveNode(node.id, {
        x: startPos.x + (e.clientX - startX),
        y: startPos.y + (e.clientY - startY),
      });
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      useMindMapStore.getState().saveToHistory();
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleDoubleClick = () => {
    setIsEditing(true);
  };

  const handleBlur = () => {
    if (label.trim() !== node.label) {
      updateNode(node.id, { label: label.trim() || 'Node' });
    }
    setIsEditing(false);
    useMindMapStore.getState().saveToHistory();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      inputRef.current?.blur();
    }
    if (isSelected) {
      e.stopPropagation(); 
    }
  };

  const handleNodeKeyDown = (e: React.KeyboardEvent<SVGGElement>) => {
    if (isSelected) {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        removeNode(node.id);
      }
    }
  };
  
  // Component to handle node shape rendering
  const NodeVisual = () => {
    const baseProps = {
      fill: node.color,
      stroke: isSelected ? '#1E293B' : isConnectSource ? '#10B981' : 'white',
      strokeWidth: isSelected || isConnectSource ? '4' : '2',
      className: 'transition-all',
    };

    if (node.shape === 'rectangle') {
        return (
            <rect 
                x="-50" 
                y="-25" 
                width="100" 
                height="50" 
                rx="8" // rounded corners
                {...baseProps}
            />
        );
    }
    
    // Default shape: circle
    return (
        <circle r="50" {...baseProps} />
    );
  };
  // ---------------------------------------------

  // Determine text position and styling
  const isRect = node.shape === 'rectangle';
  
  // FIX: Vertical centering for SVG text: 
  // SVG text anchors to the baseline. '5' generally centers a 12px font in a 24px height.
  const textY = isRect ? 5 : 5; 
  const foreignObjectHeight = '24';
  const foreignObjectY = '-12';

  const textStyle: React.CSSProperties = {
    fontWeight: node.textStyle?.bold ? 'bold' : 'normal',
    fontStyle: node.textStyle?.italic ? 'italic' : 'normal',
    textDecoration: node.textStyle?.underline ? 'underline' : 'none',
  };

  return (
    <g
      transform={`translate(${node.position.x}, ${node.position.y})`}
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
      onContextMenu={handleContextMenu}
      onKeyDown={handleNodeKeyDown}
      className="cursor-move"
      role="button"
      aria-label={`Node: ${node.label}`}
      tabIndex={0}
    >
      
      <NodeVisual />

      {/* --- CONTEXT MENU UI (Foreign Object) --- */}
      {isMenuOpen && (
        <foreignObject x={-node.position.x} y={-node.position.y} width="100vw" height="100vh">
          <div
            style={{
              position: 'absolute',
              left: menuPosition.x,
              top: menuPosition.y,
              zIndex: 100,
            }}
            className="bg-white rounded-lg shadow-xl py-1 w-40 text-sm ring-1 ring-gray-900 ring-opacity-5"
            onClick={(e) => e.stopPropagation()} // Prevent global click listener from closing immediately
          >
            <button
              onClick={handleDelete}
              className="w-full text-left px-4 py-2 hover:bg-red-50 text-red-600"
            >
              Delete Node
            </button>
            <button
              onClick={handleRename}
              className="w-full text-left px-4 py-2 hover:bg-gray-100"
            >
              Rename
            </button>

            {/* --- TEXT FORMATTING OPTIONS --- */}
            <div className="flex justify-around border-t border-gray-100 mt-1 pt-1">
                <button
                    onClick={() => handleFormat('bold')}
                    className={`p-2 hover:bg-gray-100 rounded text-base ${node.textStyle?.bold ? 'font-bold text-blue-600' : 'text-gray-700'}`}
                >
                    B
                </button>
                <button
                    onClick={() => handleFormat('italic')}
                    className={`p-2 hover:bg-gray-100 rounded text-base ${node.textStyle?.italic ? 'italic text-blue-600' : 'text-gray-700'}`}
                >
                    I
                </button>
                <button
                    onClick={() => handleFormat('underline')}
                    className={`p-2 hover:bg-gray-100 rounded text-base ${node.textStyle?.underline ? 'underline text-blue-600' : 'text-gray-700'}`}
                >
                    U
                </button>
            </div>
            
            {/* --- RECOLOR SUBMENU (ON HOVER) --- */}
            <div 
              className="relative border-t border-gray-100 mt-1 pt-1"
              onMouseEnter={() => setIsColorMenuOpen(true)}
              onMouseLeave={() => setIsColorMenuOpen(false)}
            >
              <button
                className="w-full text-left px-4 py-2 hover:bg-gray-100 flex justify-between items-center"
                // Click falls back to a random color if the user doesn't hover
                onClick={(e) => { e.stopPropagation(); handleRecolor(getRandomColor()); }} 
              >
                Recolor
                <span className="text-xs text-gray-400">►</span>
              </button>
              
              {isColorMenuOpen && (
                <div 
                  className="absolute left-full top-0 ml-1 bg-white rounded-lg shadow-xl py-2 px-2 w-32 ring-1 ring-gray-900 ring-opacity-5"
                  // Ensure the submenu does not auto-close when cursor is over it
                  onMouseEnter={() => setIsColorMenuOpen(true)}
                  onMouseLeave={() => setIsColorMenuOpen(false)}
                >
                  <div className="grid grid-cols-4 gap-2">
                    {COLOR_PALETTE.map(color => (
                      <button
                        key={color}
                        onClick={(e) => { e.stopPropagation(); handleRecolor(color); }}
                        className="w-5 h-5 rounded-full border border-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* --- CHANGE SHAPE SUBMENU (ON HOVER) --- */}
            <div 
              className="relative"
              onMouseEnter={() => setIsShapeMenuOpen(true)}
              onMouseLeave={() => setIsShapeMenuOpen(false)}
            >
              <button
                className="w-full text-left px-4 py-2 hover:bg-gray-100 flex justify-between items-center"
              >
                Change Shape
                <span className="text-xs text-gray-400">►</span>
              </button>
              
              {isShapeMenuOpen && (
                <div 
                  className="absolute left-full top-0 ml-1 bg-white rounded-lg shadow-xl py-1 w-32 ring-1 ring-gray-900 ring-opacity-5"
                  onMouseEnter={() => setIsShapeMenuOpen(true)}
                  onMouseLeave={() => setIsShapeMenuOpen(false)}
                >
                  {SHAPES.map(shape => (
                    <button
                      key={shape}
                      onClick={(e) => { e.stopPropagation(); handleChangeShape(shape as MindNode['shape']); }}
                      className={`w-full text-left px-4 py-2 hover:bg-gray-100 capitalize ${node.shape === shape ? 'font-bold text-blue-600' : ''}`}
                    >
                      {shape}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </foreignObject>
      )}
      {/* --- END CONTEXT MENU UI --- */}
      
      {isEditing ? (
        <foreignObject x="-45" y={foreignObjectY} width="90" height={foreignObjectHeight}>
          <input
            ref={inputRef}
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className="w-full h-full text-center text-sm bg-white rounded px-1 outline-none"
            style={{ color: '#1E293B' }}
          />
        </foreignObject>
      ) : (
        <text
          y={textY}
          textAnchor="middle"
          fontSize="12"
          fill="white"
          pointerEvents="none"
          className="select-none"
          style={textStyle} // Apply text formatting styles
        >
          {node.label.length > 12 
            ? node.label.substring(0, 12) + '...'
            : node.label}
        </text>
      )}
    </g>
  );
};

export default Node;