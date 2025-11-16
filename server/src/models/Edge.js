const mongoose = require("mongoose");

const EdgeSchema = new mongoose.Schema({
    mapId: { type: String, required: true },
    from: { type: String, required: true },
    to: { type: String, required: true },
    metadata: Object
});

module.exports = mongoose.model("Edge", EdgeSchema);
