const mongoose = require("mongoose");

const predictionHistorySchema = new mongoose.Schema(
  {
    sessionId: { type: String, required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    modelVersion: { type: String, required: true, index: true },
    datasetVersion: { type: String, required: true, index: true },
    prediction: { type: String, required: true },
    probability: { type: Number, required: true },
    confidence: { type: Number, required: true },
    riskLevel: { type: String, required: true, enum: ["LOW", "MEDIUM", "HIGH"], index: true },
    features: { type: Object, default: {} },
    timestamp: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("PredictionHistory", predictionHistorySchema, "prediction_history");
