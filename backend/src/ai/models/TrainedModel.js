const mongoose = require("mongoose");

const trainedModelSchema = new mongoose.Schema(
  {
    modelName: { type: String, required: true, index: true },
    modelType: { type: String, required: true },
    datasetVersion: { type: String, required: true, index: true },
    datasetId: { type: mongoose.Schema.Types.ObjectId, ref: "TrainingDataset" },
    version: { type: String, required: true, index: true },
    trainedAt: { type: Date, default: Date.now, index: true },
    trainingConfig: { type: Object, default: {} },
    metrics: { type: Object, default: {} },
    featureNames: { type: [String], default: [] },
    modelArtifacts: { type: Object, default: {} },
    trainingRecordCount: { type: Number, default: 0 },
    testRecordCount: { type: Number, default: 0 },
    selectionMetric: { type: String },
    selectionReason: { type: String },
    selectionValue: { type: Number },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

trainedModelSchema.index({ modelName: 1, version: 1 }, { unique: true });

module.exports = mongoose.model("TrainedModel", trainedModelSchema, "trained_models");
