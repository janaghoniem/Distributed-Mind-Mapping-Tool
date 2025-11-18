const { MongoClient } = require('mongodb');
const Y = require('yjs');
const config = require('../config/database');

class MongoDBPersistence {
  constructor() {
    this.client = null;
    this.db = null;
    this.collection = null;
    this.connected = false;
  }

  async connect() {
    if (this.connected) return;

    try {
      this.client = new MongoClient(config.MONGODB_URI);
      await this.client.connect();
      
      this.db = this.client.db(config.DB_NAME || 'mindmap');
      this.collection = this.db.collection('yjs_documents');
      
      // Create indexes
      await this.collection.createIndex({ _id: 1 });
      await this.collection.createIndex({ updatedAt: -1 });
      
      this.connected = true;
      console.log('✅ Yjs MongoDB persistence connected');
    } catch (error) {
      console.error('❌ MongoDB connection error:', error);
      throw error;
    }
  }

  async getYDoc(docName) {
    await this.connect();

    const doc = await this.collection.findOne({ _id: docName });
    if (doc && doc.state) {
      return Buffer.from(doc.state);
    }
    return null;
  }

  async storeUpdate(docName, update) {
    await this.connect();

    await this.collection.updateOne(
      { _id: docName },
      {
        $set: {
          state: Buffer.from(update),
          updatedAt: new Date()
        }
      },
      { upsert: true }
    );
  }

  async deleteDoc(docName) {
    await this.connect();
    await this.collection.deleteOne({ _id: docName });
  }

  async listDocs() {
    await this.connect();
    return await this.collection.find({}).project({ _id: 1, updatedAt: 1 }).toArray();
  }

  async close() {
    if (this.client) {
      await this.client.close();
      this.connected = false;
    }
  }
}

module.exports = { MongoDBPersistence };