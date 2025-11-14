import React, { useState } from 'react';
import { useMindMapStore } from '../store/useMindMapStore';
import { FiUsers as Users } from 'react-icons/fi';

const StatusBar: React.FC = () => {
  const { nodes, edges, viewState, connectMode } = useMindMapStore();
  const [onlineUsers] = useState(1);

  return (
    <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg px-4 py-2 flex items-center gap-4 text-sm text-gray-600">
      <div className="flex items-center gap-2">
        <Users size={16} />
        <span>{onlineUsers} online</span>
      </div>
      <div className="w-px h-4 bg-gray-300" />
      <span>{nodes.length} nodes</span>
      <span>{edges.length} edges</span>
      <div className="w-px h-4 bg-gray-300" />
      <span>Zoom: {Math.round(viewState.zoom * 100)}%</span>
      {connectMode && (
        <>
          <div className="w-px h-4 bg-gray-300" />
          <span className="text-blue-600 font-medium">Connect Mode Active</span>
        </>
      )}
    </div>
  );
};
export default StatusBar;