const Y = require('yjs');
const { WebSocketServer } = require('ws');
const { setupWSConnection } = require('y-websocket/bin/utils');
const { MongoDBPersistence } = require('./yjsPersistence');

class YjsSyncService {
  constructor(server) {
    this.persistence = new MongoDBPersistence();
    this.wss = new WebSocketServer({ 
      server, 
      path: '/yjs' 
    });

    this.setupWebSocket();
  }

  setupWebSocket() {
    this.wss.on('connection', (ws, req) => {
      const url = new URL(req.url, 'http://localhost');
      const roomName = url.searchParams.get('room') || 'default';
      const clientId = url.searchParams.get('clientId') || 'anonymous';

      console.log(`🔗 Client ${clientId} connected to room: ${roomName}`);

      setupWSConnection(ws, req, {
        gc: true,
        persistence: {
          bindState: async (docName, ydoc) => {
            const persistedDoc = await this.persistence.getYDoc(docName);
            if (persistedDoc) {
              Y.applyUpdate(ydoc, persistedDoc);
            }
          },
          writeState: async (docName, ydoc) => {
            const update = Y.encodeStateAsUpdate(ydoc);
            await this.persistence.storeUpdate(docName, update);
          }
        }
      });

      ws.on('close', () => {
        console.log(`❌ Client ${clientId} disconnected`);
      });
    });
  }

  getConnectionCount() {
    return this.wss.clients.size;
  }
}

module.exports = { YjsSyncService };