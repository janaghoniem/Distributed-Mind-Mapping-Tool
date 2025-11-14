import React, { useEffect, useRef, useState } from 'react';
import { useMindMapStore } from '../store/useMindMapStore';
import type { Position, Node as MindNode, Edge as MindEdge } from '../types';
import Node from './Node';
import { Edge } from './Edge';

const MindMapCanvas: React.FC = () => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<Position>({ x: 0, y: 0 });

  const { nodes, edges, viewState, setViewState, removeEdge, selectNode, setCanvasRef } = useMindMapStore();

  useEffect(() => {
    setCanvasRef(svgRef);
  }, [setCanvasRef]);

  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (e.button === 0 || (e.button === 0 && e.ctrlKey)) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - viewState.offset.x, y: e.clientY - viewState.offset.y });
      e.preventDefault();
    } else if (e.target === e.currentTarget) {
      selectNode(null);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (isPanning) {
      setViewState({
        offset: {
          x: e.clientX - panStart.x,
          y: e.clientY - panStart.y
        }
      });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };
  
  const handleWheel = (e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1; 
    const newZoom = Math.max(0.5, Math.min(2, viewState.zoom * zoomFactor));

    const rect = svgRef.current!.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;

    const oldOffset = viewState.offset;
    const oldZoom = viewState.zoom;

    const centerX = (clientX - oldOffset.x) / oldZoom;
    const centerY = (clientY - oldOffset.y) / oldZoom;

    const newOffsetX = clientX - centerX * newZoom;
    const newOffsetY = clientY - centerY * newZoom;

    setViewState({
      zoom: newZoom,
      offset: { x: newOffsetX, y: newOffsetY }
    });
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // FIX for 'N' key bug: Check if an input field is focused (e.g., node label or map name)
      const activeElement = document.activeElement;
      const isInputFocused = activeElement?.tagName === 'INPUT' || activeElement?.tagName === 'TEXTAREA';

      // Ignore shortcuts if an input is focused
      if (isInputFocused) {
          return;
      }
      // END FIX

      if (e.key === 'z' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        useMindMapStore.getState().undo();
      } else if (e.key === 'y' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        useMindMapStore.getState().redo();
      } else if (e.key === 'n') {
        useMindMapStore.getState().addNode();
      } else if (e.key === 'c') {
        const store = useMindMapStore.getState();
        store.setConnectMode(!store.connectMode);
      } else if (e.key === 'r') {
        useMindMapStore.getState().resetView();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const cursorClass = isPanning ? 'cursor-grabbing' : 'cursor-grab';

  return (
    <svg
      ref={svgRef}
      className={`w-full h-full bg-gray-50 ${cursorClass}`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
      role="application"
      aria-label="Mind map canvas"
    >
      <defs>
        <marker
          id="arrowhead"
          markerWidth="10"
          markerHeight="10"
          refX="9"
          refY="3"
          orient="auto"
        >
          <polygon points="0 0, 10 3, 0 6" fill="#94A3B8" />
        </marker>

        {/* FIX for Zoom/Grid: Apply the viewState's transform to the pattern so it scales with the canvas */}
        {/* Apply patternTransform to the pattern so it scales with the canvas */}
        <pattern
          id="smallGrid"
          width="10"
          height="10"
          patternUnits="userSpaceOnUse"
          patternTransform={`translate(${viewState.offset.x}, ${viewState.offset.y}) scale(${viewState.zoom})`}
        >
          <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#E5E7EB" strokeWidth="0.5" />
        </pattern>
        <pattern
          id="grid"
          width="100"
          height="100"
          patternUnits="userSpaceOnUse"
          patternTransform={`translate(${viewState.offset.x}, ${viewState.offset.y}) scale(${viewState.zoom})`}
        >
          <rect width="100" height="100" fill="url(#smallGrid)" />
          <path d="M 100 0 L 0 0 0 100" fill="none" stroke="#D1D5DB" strokeWidth="1" />
        </pattern>
      </defs>

      {/* The grid background is now purely a large, static element centered at the origin (0,0). 
          Its internal pattern moves and scales via the patternTransform above.
      */}
      <rect 
        x="-25000" // Set to a large negative number
        y="-25000" // Set to a large negative number
        width="50000" // Very large size
        height="50000" // Very large size
        fill="url(#grid)" 
      />

      {/* Main transform group for nodes and edges (this already handles node zoom) */}
      <g transform={`translate(${viewState.offset.x}, ${viewState.offset.y}) scale(${viewState.zoom})`}>
        {edges.map(edge => (
          <Edge key={edge.id} edge={edge} nodes={nodes} onRemove={removeEdge} />
        ))}
        {nodes.map(node => (
          <Node key={node.id} node={node} />
        ))}
      </g>
    </svg>
  );
};

export default MindMapCanvas;