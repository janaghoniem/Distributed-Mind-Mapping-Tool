import React from 'react';
import type { Edge as EdgeType, Node } from '../types';

interface EdgeProps {
  edge: EdgeType;
  nodes: Node[];
  onRemove: (id: string) => void;
}

export const Edge: React.FC<EdgeProps> = ({ edge, nodes, onRemove }) => {
  const sourceNode = nodes.find(n => n.id === edge.source);
  const targetNode = nodes.find(n => n.id === edge.target);

  if (!sourceNode || !targetNode) return null;

  const midX = (sourceNode.position.x + targetNode.position.x) / 2;
  const midY = (sourceNode.position.y + targetNode.position.y) / 2;

  return (
    <g role="img" aria-label={`Edge from ${sourceNode.label} to ${targetNode.label}`}>
      <line
        x1={sourceNode.position.x}
        y1={sourceNode.position.y}
        x2={targetNode.position.x}
        y2={targetNode.position.y}
        stroke="#94A3B8"
        strokeWidth="2"
        markerEnd="url(#arrowhead)"
        className="transition-all"
      />
      <circle
        cx={midX}
        cy={midY}
        r="8"
        fill="#EF4444"
        className="cursor-pointer opacity-0 hover:opacity-100 transition-opacity"
        onClick={(e) => {
          e.stopPropagation();
          onRemove(edge.id);
        }}
        role="button"
        aria-label="Remove edge"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onRemove(edge.id);
          }
        }}
      />
    </g>
  );
};