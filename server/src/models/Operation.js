const mongoose = require("mongoose");

const OperationSchema = new mongoose.Schema({
    mapId: { type: String, required: true },
    type: { type: String, required: true },   // e.g. "addNode", "renameNode", etc.
    payload: { type: Object, required: true },
    vectorClock: { type: Object, required: true },
    timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Operation", OperationSchema);
