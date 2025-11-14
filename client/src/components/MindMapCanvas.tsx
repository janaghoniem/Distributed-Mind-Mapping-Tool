import React, { useEffect, useRef, useState } from 'react';
import { useMindMapStore } from '../store/useMindMapStore';
import type { Position, Node as MindNode, Edge as MindEdge } from '../types';
import Node from './Node';
import { Edge } from './Edge';

const MindMapCanvas: React.FC = () => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<Position>({ x: 0, y: 0 });

  const { nodes, edges, viewState, setViewState, removeEdge, selectNode } = useMindMapStore();

  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
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
    const delta = e.deltaY > 0 ? -0.05 : 0.05;
    setViewState({ zoom: Math.max(0.5, Math.min(2, viewState.zoom + delta)) });
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z') {
          e.preventDefault();
          useMindMapStore.getState().undo();
        } else if (e.key === 'y') {
          e.preventDefault();
          useMindMapStore.getState().redo();
        }
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

  return (
    <svg
      ref={svgRef}
      className="w-full h-full bg-gray-50"
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
      </defs>

      <g transform={`translate(${viewState.offset.x}, ${viewState.offset.y}) scale(${viewState.zoom})`}>
        {edges.map((edge: MindEdge) => (
          <Edge key={edge.id} edge={edge} nodes={nodes} onRemove={removeEdge} />
        ))}

        {nodes.map((node: MindNode) => (
          <Node key={node.id} node={node} />
        ))}
      </g>
    </svg>
  );
};

export default MindMapCanvas;