const TrainingDataset = require("../models/TrainingDataset");

const loadDataset = async ({ datasetId, datasetVersion, latest = false } = {}) => {
  if (datasetId) {
    return TrainingDataset.findById(datasetId).lean();
  }

  if (datasetVersion) {
    return TrainingDataset.findOne({ datasetVersion }).lean();
  }

  if (latest) {
    return TrainingDataset.findOne({}).sort({ generatedDate: -1 }).lean();
  }

  return TrainingDataset.findOne({}).sort({ generatedDate: -1 }).lean();
};

module.exports = { loadDataset };
