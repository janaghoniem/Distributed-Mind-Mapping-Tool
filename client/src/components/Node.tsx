import React, { useRef, useState } from 'react';
import { useMindMapStore } from '../store/useMindMapStore';
import type { Node as MindNode } from '../types';

const Node: React.FC<{ node: MindNode }> = ({ node }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [label, setLabel] = useState(node.label);
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

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isEditing) return;
    
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
    const startPos = { ...node.position };

    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      moveNode(node.id, {
        x: startPos.x + dx,
        y: startPos.y + dy
      });
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleDoubleClick = () => {
    setIsEditing(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleBlur = () => {
    setIsEditing(false);
    if (label.trim()) {
      updateNode(node.id, { label: label.trim() });
    } else {
      setLabel(node.label);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleBlur();
    } else if (e.key === 'Escape') {
      setLabel(node.label);
      setIsEditing(false);
    } else if (!isEditing && isSelected) {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        removeNode(node.id);
      }
    }
  };

  return (
    <g
      transform={`translate(${node.position.x}, ${node.position.y})`}
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
      className="cursor-move"
      role="button"
      aria-label={`Node: ${node.label}`}
      tabIndex={0}
    >
      <circle
        r="50"
        fill={node.color}
        stroke={isSelected ? '#1E293B' : isConnectSource ? '#10B981' : 'white'}
        strokeWidth={isSelected || isConnectSource ? '4' : '2'}
        className="transition-all"
      />
      {isEditing ? (
        <foreignObject x="-45" y="-12" width="90" height="24">
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
          textAnchor="middle"
          dy="0.3em"
          fill="white"
          className="text-sm font-medium pointer-events-none select-none"
        >
          {node.label.length > 12 ? node.label.slice(0, 12) + '...' : node.label}
        </text>
      )}
    </g>
  );
};

export default Node;