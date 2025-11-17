// server/src/models/Node.js
const mongoose = require('mongoose');

const nodeSchema = new mongoose.Schema({
  // Basic identity
  nodeId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  mapId: {
    type: String,
    required: true,
    index: true
  },
  
  // Node content
  content: {
    type: String,
    default: '',
    maxlength: 5000
  },
  
  // Visual properties
  position: {
    x: { type: Number, required: true, default: 0 },
    y: { type: Number, required: true, default: 0 }
  },
  
  // Graph metadata
  parentId: {
    type: String,
    default: null,  // null = root node
    index: true
  },
  
  children: [{
    type: String  // Array of child node IDs
  }],
  
  depth: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // Edge tracking (for quick lookups)
  incomingEdges: [{
    type: String  // Array of edge IDs pointing to this node
  }],
  
  outgoingEdges: [{
    type: String  // Array of edge IDs from this node
  }],
  
  // State flags
  isOrphan: {
    type: Boolean,
    default: false,
    index: true
  },
  
  isDeleted: {
    type: Boolean,
    default: false,
    index: true
  },
  
  // Style/appearance
  style: {
    color: { type: String, default: '#3b82f6' },
    shape: { 
      type: String, 
      enum: ['rectangle', 'circle', 'diamond', 'rounded'],
      default: 'rounded' 
    },
    fontSize: { type: Number, default: 14, min: 10, max: 24 }
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
  
  // Version control (for CRDT)
  version: {
    type: Number,
    default: 1
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
nodeSchema.index({ mapId: 1, isDeleted: 1 });
nodeSchema.index({ mapId: 1, parentId: 1 });
nodeSchema.index({ mapId: 1, isOrphan: 1 });

// Virtual for checking if root
nodeSchema.virtual('isRoot').get(function() {
  return this.parentId === null;
});

module.exports = mongoose.model('Node', nodeSchema);