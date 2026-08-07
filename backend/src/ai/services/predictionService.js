const { buildRiskLevel, roundMetric, transformFeaturesToVector } = require("../utils/mlUtils");
const PredictionHistory = require("../models/PredictionHistory");
const TrainedModel = require("../models/TrainedModel");

const getLatestModel = async () => TrainedModel.findOne({ isActive: true }).sort({ trainedAt: -1 }).lean();

const sigmoid = (value) => {
  if (value >= 0) {
    const z = Math.exp(-value);
    return 1 / (1 + z);
  }
  const z = Math.exp(value);
  return z / (1 + z);
};

const scoreLogistic = ({ model, features }) => {
  const ma = model?.modelArtifacts || {};
  const coeffs = Array.isArray(ma.coefficients) ? ma.coefficients : [];
  const bias = Number(ma.bias || 0);
  const means = Array.isArray(ma.means) ? ma.means : [];
  const stds = Array.isArray(ma.stds) ? ma.stds : [];
  const featureNames = Array.isArray(ma.featureNames) ? ma.featureNames : [];
  if (!coeffs.length || !featureNames.length) return null;
  const fv = featureNames.map((name, j) => (Number(features?.[name] || 0) - (means[j] || 0)) / (stds[j] || 1));
  const linear = fv.reduce((s, v, j) => s + v * coeffs[j], 0) + bias;
  return sigmoid(linear);
};

const scoreDecisionStump = ({ model, features }) => {
  const stump = model?.modelArtifacts?.stump;
  const fnames = model.featureNames || [];
  if (!stump) return null;
  const fi = stump.featureIndex;
  const fname = fnames[fi];
  const value = Number(features?.[fname] || 0);
  return value <= stump.threshold ? stump.leftClass : stump.rightClass;
};

const scoreRandomForest = ({ model, features }) => {
  const trees = model?.modelArtifacts?.trees || [];
  const fnames = model.featureNames || model?.modelArtifacts?.featureNames || [];
  if (!trees.length) return null;
  const row = fnames.map((name) => Number(features?.[name] || 0));
  const votes = trees.map((t) => (row[t.stump.featureIndex] <= t.stump.threshold ? t.stump.leftClass : t.stump.rightClass));
  return votes.reduce((s, v) => s + v, 0) / votes.length;
};

const scoreGradientBoosting = ({ model, features }) => {
  const trees = model?.modelArtifacts?.trees || [];
  const F0 = model?.modelArtifacts?.F0 || 0;
  const lr = model?.modelArtifacts?.learningRate || 0.1;
  const fnames = model.featureNames || model?.modelArtifacts?.featureNames || [];
  if (!trees.length) return null;
  const row = fnames.map((name) => Number(features?.[name] || 0));
  let score = F0;
  for (const t of trees) {
    const pred = row[t.stump.featureIndex] <= t.stump.threshold ? t.stump.leftClass : t.stump.rightClass;
    score += lr * pred;
  }
  return sigmoid(score);
};

const scoreModel = ({ model, features }) => {
  if (!model) return null;
  const type = model.modelType;
  if (type === 'logistic_regression') return scoreLogistic({ model, features });
  if (type === 'decision_tree') return scoreDecisionStump({ model, features });
  if (type === 'random_forest') return scoreRandomForest({ model, features });
  if (type === 'gradient_boosting') return scoreGradientBoosting({ model, features });
  return null;
};

const predictFromFeatures = async ({ features = {}, modelVersion, datasetVersion, sessionId, userId }) => {
  const latestModel = modelVersion
    ? await TrainedModel.findOne({ version: modelVersion }).lean()
    : await getLatestModel();

  if (!latestModel) {
    throw new Error('No trained model available');
  }

  const transformedFeatures = transformFeaturesToVector(features || {});
  const prob = scoreModel({ model: latestModel, features: transformedFeatures });
  const probability = prob !== null ? Number(Math.min(0.999, Math.max(0.0, prob))) : null;
  const prediction = probability !== null ? (probability >= 0.5 ? 'ABANDON' : 'PURCHASE') : 'UNKNOWN';
  const confidence = probability !== null ? Math.min(99, Math.max(50, Math.round(probability * 100))) : null;
  const riskLevel = probability !== null ? buildRiskLevel(probability) : 'UNKNOWN';

  const historyEntry = await PredictionHistory.create({
    sessionId: sessionId || 'unknown',
    userId,
    modelVersion: latestModel.version,
    datasetVersion: datasetVersion || latestModel.datasetVersion,
    prediction,
    probability: probability !== null ? roundMetric(probability) : null,
    confidence,
    riskLevel,
    features: transformedFeatures,
    timestamp: new Date(),
  });

  return {
    prediction,
    probability: probability !== null ? roundMetric(probability) : null,
    confidence,
    riskLevel,
    modelVersion: latestModel.version,
    datasetVersion: datasetVersion || latestModel.datasetVersion,
    historyId: historyEntry._id,
    _id: historyEntry._id,
  };
};

module.exports = { getLatestModel, predictFromFeatures };
