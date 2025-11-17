//index.ts
export interface Position {
  x: number;
  y: number;
}

export interface Node {
  id: string;
  label: string;
  position: Position;
  color: string;
  shape: 'circle' | 'rectangle';
  textStyle?: { 
    bold: boolean;
    italic: boolean;
    underline: boolean;
  };
}

export interface Edge {
  id: string;
  source: string;
  target: string;
}

export interface ViewState {
  zoom: number;
  offset: Position;
}

export interface HistoryState {
  nodes: Node[];
  edges: Edge[];
}

export interface Cursor {
  userId: string;
  position: Position;
  color: string;
  username?: string;
}

export interface WebSocketMessage {
  type: 'node:add' | 'node:remove' | 'node:update' | 'node:move' | 
        'edge:add' | 'edge:remove' | 'cursor:update' | 'sync';
  payload: any;
  userId: string;
  timestamp: number;
}

export interface SyncPayload {
  nodes: Node[];
  edges: Edge[];
}