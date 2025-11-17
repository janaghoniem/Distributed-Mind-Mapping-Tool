// server/src/models/Edge.js
const mongoose = require("mongoose");

const EdgeSchema = new mongoose.Schema({
    edgeId: {  // ADD THIS - unique identifier
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
    from: { 
        type: String, 
        required: true,
        index: true 
    },
    to: { 
        type: String, 
        required: true,
        index: true 
    },
    metadata: Object,
    
    // ADD THESE - for soft delete and timestamps
    isDeleted: {
        type: Boolean,
        default: false,
        index: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true  // ADD THIS
});

// ADD THESE INDEXES
EdgeSchema.index({ mapId: 1, from: 1 });
EdgeSchema.index({ mapId: 1, to: 1 });
EdgeSchema.index({ mapId: 1, isDeleted: 1 });

module.exports = mongoose.model("Edge", EdgeSchema);