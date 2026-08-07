const mongoose = require("mongoose");

const datasetRecordSchema = new mongoose.Schema(
  {
    sessionId: { type: String, required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    features: { type: Object, default: {} },
    label: { type: Number, enum: [0, 1], required: true },
    datasetVersion: { type: String, required: true, index: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const trainingDatasetSchema = new mongoose.Schema(
  {
    datasetVersion: { type: String, required: true, unique: true, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    createdAt: { type: Date, default: Date.now, index: true },
    numberOfRecords: { type: Number, default: 0 },
    totalSessions: { type: Number, default: 0 },
    processedSessions: { type: Number, default: 0 },
    purchasedSessions: { type: Number, default: 0 },
    abandonedSessions: { type: Number, default: 0 },
    generatedDate: { type: Date, default: Date.now },
    status: { type: String, enum: ["generated", "exported"], default: "generated" },
    records: [datasetRecordSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model("TrainingDataset", trainingDatasetSchema, "training_datasets");
