// const mongoose = require('mongoose');

// const nodeSchema = new mongoose.Schema({
//     id: String,
//     label: String,
//     position: { x: Number, y: Number },
// });

// const edgeSchema = new mongoose.Schema({
//     from: String,
//     to: String,
// });

// module.exports = mongoose.model('Map', new mongoose.Schema({
//     nodes: [nodeSchema],
//     edges: [edgeSchema],
//     vectorClock: { type: Object, default: {} }
// }));


// server/src/models/Map.js
// Defines the schema for mind maps

const mongoose = require('mongoose');

const MapSchema = new mongoose.Schema({
  // Unique identifier for the map
  mapId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
  // Map metadata
  title: {
    type: String,
    required: true,
    default: 'Untitled Map'
  },
  
  description: {
    type: String,
    default: ''
  },
  
  // Owner information
  ownerId: {
    type: String,
    default: 'system' 
  },
  
  // Vector clock for causality tracking
  // Format: { clientId: sequenceNumber }
  vectorClock: {
    type: Map,
    of: Number,
    default: new Map()
  },
  
  // Current version number (increments on each change)
  version: {
    type: Number,
    default: 0
  },
  
  // Active sessions (users currently editing)
  activeSessions: [{
    sessionId: String,
    clientId: String,
    joinedAt: Date,
    lastSeenAt: Date
  }],
  
  // Map statistics
  stats: {
    nodeCount: { type: Number, default: 0 },
    edgeCount: { type: Number, default: 0 },
    totalOperations: { type: Number, default: 0 }
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  
  updatedAt: {
    type: Date,
    default: Date.now
  },
  
  // Soft delete flag
  isDeleted: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true, // Automatically manage createdAt and updatedAt
  collection: 'maps'
});

// Indexes for efficient queries
MapSchema.index({ ownerId: 1, createdAt: -1 });
MapSchema.index({ 'activeSessions.sessionId': 1 });

// Methods
MapSchema.methods.updateVectorClock = function(clientId, sequenceNumber) {
  this.vectorClock.set(clientId, sequenceNumber);
  this.markModified('vectorClock');
};

MapSchema.methods.addSession = function(sessionId, clientId) {
  this.activeSessions.push({
    sessionId,
    clientId,
    joinedAt: new Date(),
    lastSeenAt: new Date()
  });
};

MapSchema.methods.removeSession = function(sessionId) {
  this.activeSessions = this.activeSessions.filter(
    s => s.sessionId !== sessionId
  );
};

MapSchema.methods.updateSessionActivity = function(sessionId) {
  const session = this.activeSessions.find(s => s.sessionId === sessionId);
  if (session) {
    session.lastSeenAt = new Date();
  }
};

module.exports = mongoose.model('Map', MapSchema);