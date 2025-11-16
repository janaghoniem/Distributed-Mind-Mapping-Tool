const mongoose = require("mongoose");

const NodeSchema = new mongoose.Schema({
  mapId: String,
  nodeId: String,
  label: String,
  position: {
    x: Number,
    y: Number
  },
  deleted: {
    type: Boolean,
    default: false
  }
});

module.exports = mongoose.model("Node", NodeSchema);
