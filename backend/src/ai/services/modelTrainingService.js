const { buildFeatureMatrix, splitDataset } = require("./preprocessingService");
const { roundMetric, transformFeaturesToVector } = require("../utils/mlUtils");

const MIN_TRAINING_RECORDS = Number(process.env.MIN_TRAINING_RECORDS) || 100;
const MIN_SAMPLES_PER_CLASS = Number(process.env.MIN_SAMPLES_PER_CLASS) || 20;
const MIN_TEST_SAMPLES = Number(process.env.MIN_TEST_SAMPLES) || 20;

const sigmoid = (value) => {
  // numerically stable sigmoid
  if (value >= 0) {
    const z = Math.exp(-value);
    return 1 / (1 + z);
  }
  const z = Math.exp(value);
  return z / (1 + z);
};

const aucFromScores = (scores, labels) => {
  const paired = scores.map((s, i) => ({ s, label: labels[i] }));
  const pos = paired.filter((p) => p.label === 1).map((p) => p.s);
  const neg = paired.filter((p) => p.label === 0).map((p) => p.s);
  if (pos.length === 0 || neg.length === 0) return null;
  // Mann-Whitney U statistic
  let wins = 0;
  for (const p of pos) {
    for (const n of neg) {
      if (p > n) wins += 1;
      else if (p === n) wins += 0.5;
    }
  }
  return wins / (pos.length * neg.length);
};

const computeMetricsFromProbs = (probs, labels) => {
  if (!labels.length) return null;
  const rocAuc = aucFromScores(probs, labels);
  // predictions at 0.5
  const preds = probs.map((p) => (p >= 0.5 ? 1 : 0));
  let tp = 0; let fp = 0; let fn = 0; let tn = 0;
  preds.forEach((pred, i) => {
    const actual = labels[i];
    if (pred === 1 && actual === 1) tp += 1;
    if (pred === 1 && actual === 0) fp += 1;
    if (pred === 0 && actual === 1) fn += 1;
    if (pred === 0 && actual === 0) tn += 1;
  });

  const accuracy = (tp + tn) / Math.max(1, labels.length);
  const precision = tp + fp > 0 ? tp / (tp + fp) : null;
  const recall = tp + fn > 0 ? tp / (tp + fn) : null;
  const f1Score = precision !== null && recall !== null && precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : null;

  return {
    accuracy: Number.isFinite(accuracy) ? roundMetric(accuracy) : null,
    precision: precision !== null ? roundMetric(precision) : null,
    recall: recall !== null ? roundMetric(recall) : null,
    f1Score: f1Score !== null ? roundMetric(f1Score) : null,
    rocAuc: rocAuc !== null ? roundMetric(rocAuc) : null,
    confusionMatrix: [[tn, fp], [fn, tp]],
  };
};

// Simple logistic regression with standardization and L2 regularization
const trainLogisticRegression = (trainMatrix) => {
  const { X, y, featureNames } = trainMatrix;
  const n = X.length;
  const m = featureNames.length;
  const means = new Array(m).fill(0);
  const stds = new Array(m).fill(0);

  for (let j = 0; j < m; j++) {
    const col = X.map((r) => Number(r[j] || 0));
    const mean = col.reduce((s, v) => s + v, 0) / Math.max(1, col.length);
    const variance = col.reduce((s, v) => s + (v - mean) ** 2, 0) / Math.max(1, col.length);
    const std = Math.sqrt(variance) || 1;
    means[j] = mean;
    stds[j] = std;
  }

  const Xs = X.map((row) => row.map((v, j) => (Number(v || 0) - means[j]) / stds[j]));
  const weights = new Array(m).fill(0);
  let bias = 0;
  const lr = 0.1;
  const epochs = 500;
  const lambda = 0.01; // L2

  for (let epoch = 0; epoch < epochs; epoch++) {
    const grads = new Array(m).fill(0);
    let biasGrad = 0;
    for (let i = 0; i < n; i++) {
      const row = Xs[i];
      const linear = row.reduce((sum, val, j) => sum + val * weights[j], 0) + bias;
      const p = sigmoid(linear);
      const err = p - y[i];
      for (let j = 0; j < m; j++) grads[j] += err * row[j];
      biasGrad += err;
    }
    for (let j = 0; j < m; j++) {
      weights[j] -= lr * ((grads[j] / n) + lambda * weights[j]);
    }
    bias -= lr * (biasGrad / n);
  }

  return { coefficients: weights, bias, featureNames, means, stds };
};

// Decision stump (single-split CART) for simplicity and stability
const trainDecisionStump = (trainMatrix) => {
  const { X, y, featureNames } = trainMatrix;
  const m = featureNames.length;
  const n = X.length;
  let best = { featureIndex: 0, threshold: 0, gini: Infinity, leftClass: 0, rightClass: 1 };

  for (let j = 0; j < m; j++) {
    const col = X.map((r) => Number(r[j] || 0));
    const values = Array.from(new Set(col)).sort((a, b) => a - b);
    for (let t = 0; t < values.length; t++) {
      const threshold = values[t];
      let left = [], right = [];
      for (let i = 0; i < n; i++) {
        if (X[i][j] <= threshold) left.push(y[i]); else right.push(y[i]);
      }
      const gini = (left.length / n) * giniImpurity(left) + (right.length / n) * giniImpurity(right);
      if (gini < best.gini) {
        best = { featureIndex: j, threshold, gini, leftClass: majorityClass(left), rightClass: majorityClass(right) };
      }
    }
  }
  return { stump: best, featureNames };
};

const giniImpurity = (arr) => {
  if (!arr.length) return 0;
  const p1 = arr.filter((v) => v === 1).length / arr.length;
  return 1 - (p1 * p1 + (1 - p1) * (1 - p1));
};

const majorityClass = (arr) => {
  if (!arr.length) return 0;
  const ones = arr.filter((v) => v === 1).length;
  return ones >= arr.length / 2 ? 1 : 0;
};

// Random forest of stumps
const trainRandomForest = (trainMatrix, options = {}) => {
  const nEstimators = options.nEstimators || 10;
  const subsampleSize = options.subsampleSize || Math.max(2, Math.floor(trainMatrix.X.length * 0.7));
  const m = trainMatrix.featureNames.length;
  const trees = [];
  for (let t = 0; t < nEstimators; t++) {
    // bootstrap sample
    const sampleIdx = [];
    for (let i = 0; i < subsampleSize; i++) sampleIdx.push(Math.floor(Math.random() * trainMatrix.X.length));
    const Xs = sampleIdx.map((i) => trainMatrix.X[i]);
    const ys = sampleIdx.map((i) => trainMatrix.y[i]);
    const subMatrix = { X: Xs, y: ys, featureNames: trainMatrix.featureNames };
    const stump = trainDecisionStump(subMatrix);
    trees.push(stump);
  }
  return { trees, featureNames: trainMatrix.featureNames };
};

const predictRandomForestProba = (model, row) => {
  const votes = model.trees.map((t) => {
    const fi = t.stump.featureIndex;
    const thr = t.stump.threshold;
    return row[fi] <= thr ? t.stump.leftClass : t.stump.rightClass;
  });
  const prob = votes.reduce((s, v) => s + v, 0) / votes.length;
  return prob;
};

// Gradient boosting with stumps (regression on residuals with learning rate)
const trainGradientBoosting = (trainMatrix, options = {}) => {
  const nEstimators = options.nEstimators || 20;
  const learningRate = options.learningRate || 0.1;
  const m = trainMatrix.featureNames.length;
  const F0 = trainMatrix.y.reduce((s, v) => s + v, 0) / trainMatrix.y.length; // initial prediction
  const trees = [];
  let F = new Array(trainMatrix.y.length).fill(F0);
  for (let t = 0; t < nEstimators; t++) {
    const residuals = trainMatrix.y.map((y, i) => y - sigmoid(F[i]));
    // train stump to predict residuals (regression)
    const subMatrix = { X: trainMatrix.X, y: residuals, featureNames: trainMatrix.featureNames };
    const stump = trainDecisionStump(subMatrix);
    // update F
    for (let i = 0; i < trainMatrix.X.length; i++) {
      const fi = stump.stump.featureIndex;
      const pred = trainMatrix.X[i][fi] <= stump.stump.threshold ? stump.stump.leftClass : stump.stump.rightClass;
      F[i] += learningRate * pred;
    }
    trees.push(stump);
  }
  return { trees, F0, learningRate, featureNames: trainMatrix.featureNames };
};

const predictGradientProba = (model, row) => {
  let score = model.F0 || 0;
  for (const t of model.trees) {
    const fi = t.stump.featureIndex;
    const pred = row[fi] <= t.stump.threshold ? t.stump.leftClass : t.stump.rightClass;
    score += (model.learningRate || 0.1) * pred;
  }
  return sigmoid(score);
};

const createModelSnapshot = (modelType, metrics, featureNames, datasetVersion, version, modelArtifacts) => ({
  modelType,
  metrics,
  featureNames,
  datasetVersion,
  version,
  modelArtifacts,
});

const validateTrainingRows = (preparedRows) => {
  if (preparedRows.length < MIN_TRAINING_RECORDS) {
    throw new Error(`insufficient training data: at least ${MIN_TRAINING_RECORDS} records are required`);
  }

  const labels = preparedRows.map((row) => Number(row.label));
  const uniqueLabels = [...new Set(labels)];
  if (uniqueLabels.length < 2) {
    throw new Error("Training dataset must contain both target classes");
  }

  const classCounts = uniqueLabels.reduce((counts, label) => {
    counts[label] = labels.filter((candidate) => candidate === label).length;
    return counts;
  }, {});

  if ((classCounts[0] || 0) < MIN_SAMPLES_PER_CLASS || (classCounts[1] || 0) < MIN_SAMPLES_PER_CLASS) {
    throw new Error(`Insufficient samples per class. Each class must have at least ${MIN_SAMPLES_PER_CLASS} examples.`);
  }
};

const selectBestModel = (models) => {
  // Primary: ROC-AUC, Secondary: F1, then precision, recall, accuracy
  const scoreModel = (m) => {
    const roc = m.metrics?.rocAuc;
    const f1 = m.metrics?.f1Score;
    const prec = m.metrics?.precision;
    const rec = m.metrics?.recall;
    const acc = m.metrics?.accuracy;
    return { roc, f1, prec, rec, acc };
  };

  // Filter models with a valid ROC-AUC
  const withRoc = models.filter((m) => typeof m.metrics?.rocAuc === 'number' && m.metrics.rocAuc !== null);
  let best = null;
  if (withRoc.length) {
    best = withRoc.reduce((bestSoFar, curr) => (curr.metrics.rocAuc > bestSoFar.metrics.rocAuc ? curr : bestSoFar), withRoc[0]);
    return { best, reason: 'rocAuc' };
  }

  // fallback to f1
  const withF1 = models.filter((m) => typeof m.metrics?.f1Score === 'number' && m.metrics.f1Score !== null);
  if (withF1.length) {
    best = withF1.reduce((bestSoFar, curr) => (curr.metrics.f1Score > bestSoFar.metrics.f1Score ? curr : bestSoFar), withF1[0]);
    return { best, reason: 'f1Score' };
  }

  // otherwise pick highest accuracy
  best = models.reduce((bestSoFar, curr) => ((curr.metrics?.accuracy || 0) > (bestSoFar.metrics?.accuracy || 0) ? curr : bestSoFar), models[0]);
  return { best, reason: 'accuracy' };
};

const trainModels = async ({ dataset, datasetVersion, version, createdBy }) => {
  const preparedRows = (dataset?.records || []).map((row) => ({
    features: row.features || {},
    label: Number(row.label),
  })).filter((row) => Number.isFinite(row.label) && (row.label === 0 || row.label === 1));

  if (!preparedRows.length) {
    throw new Error("No valid rows available for training");
  }

  validateTrainingRows(preparedRows);

  const { train, test } = splitDataset(preparedRows, Number(process.env.TEST_SIZE) || 0.2);
  if (!test.length || !train.length) throw new Error('Train/test split produced empty set');
  if ((new Set(test.map((r) => r.label))).size < 2) throw new Error('Test set contains only one class; cannot evaluate ROC-AUC reliably');

  const trainMatrix = buildFeatureMatrix(train);
  const testMatrix = buildFeatureMatrix(test);

  // logistic
  const logisticModel = trainLogisticRegression(trainMatrix);
  // transform test rows using scaling
  const testXs = testMatrix.X.map((row) => row.map((v, j) => (Number(v || 0) - logisticModel.means[j]) / (logisticModel.stds[j] || 1)));
  const logisticProbs = testXs.map((row) => sigmoid(row.reduce((s, v, j) => s + v * logisticModel.coefficients[j], 0) + logisticModel.bias));
  const logisticMetrics = computeMetricsFromProbs(logisticProbs, testMatrix.y);

  // decision tree (stump based)
  const dtModel = trainDecisionStump(trainMatrix);
  const dtProbs = testMatrix.X.map((row) => {
    const fi = dtModel.stump.featureIndex;
    const thr = dtModel.stump.threshold;
    return row[fi] <= thr ? dtModel.stump.leftClass : dtModel.stump.rightClass;
  });
  const dtMetrics = computeMetricsFromProbs(dtProbs, testMatrix.y);

  // random forest
  const rfModel = trainRandomForest(trainMatrix, { nEstimators: 15 });
  const rfProbs = testMatrix.X.map((row) => predictRandomForestProba(rfModel, row));
  const rfMetrics = computeMetricsFromProbs(rfProbs, testMatrix.y);

  // gradient boosting
  const gbModel = trainGradientBoosting(trainMatrix, { nEstimators: 25, learningRate: 0.1 });
  const gbProbs = testMatrix.X.map((row) => predictGradientProba(gbModel, row));
  const gbMetrics = computeMetricsFromProbs(gbProbs, testMatrix.y);

  const models = [
    {
      modelName: 'Logistic Regression',
      modelType: 'logistic_regression',
      metrics: logisticMetrics,
      featureNames: trainMatrix.featureNames,
      datasetVersion,
      version,
      createdBy,
      testSize: test.length,
      trainSize: train.length,
      modelArtifacts: { kind: 'logistic-regression', coefficients: logisticModel.coefficients, bias: logisticModel.bias, means: logisticModel.means, stds: logisticModel.stds, featureNames: logisticModel.featureNames },
    },
    {
      modelName: 'Decision Tree',
      modelType: 'decision_tree',
      metrics: dtMetrics,
      featureNames: trainMatrix.featureNames,
      datasetVersion,
      version,
      createdBy,
      testSize: test.length,
      trainSize: train.length,
      modelArtifacts: { kind: 'decision-stump', stump: dtModel.stump },
    },
    {
      modelName: 'Random Forest',
      modelType: 'random_forest',
      metrics: rfMetrics,
      featureNames: trainMatrix.featureNames,
      datasetVersion,
      version,
      createdBy,
      testSize: test.length,
      trainSize: train.length,
      modelArtifacts: { kind: 'random-forest', trees: rfModel.trees },
    },
    {
      modelName: 'Gradient Boosting',
      modelType: 'gradient_boosting',
      metrics: gbMetrics,
      featureNames: trainMatrix.featureNames,
      datasetVersion,
      version,
      createdBy,
      testSize: test.length,
      trainSize: train.length,
      modelArtifacts: { kind: 'gradient-boosting', trees: gbModel.trees, F0: gbModel.F0, learningRate: gbModel.learningRate },
    },
  ];

  const { best, reason } = selectBestModel(models);

  const bestSnapshot = createModelSnapshot(best.modelType, best.metrics, best.featureNames, datasetVersion, version, best.modelArtifacts);
  // augment snapshot with selection info
  bestSnapshot.selectionMetric = reason;
  bestSnapshot.selectionValue = best.metrics?.[reason] ?? null;
  bestSnapshot.selectionReason = reason === 'rocAuc' ? 'selected by ROC-AUC' : `selected by ${reason}`;
  bestSnapshot.trainingInfo = { trainSize: train.length, testSize: test.length };

  return {
    models,
    bestModel: bestSnapshot,
    evaluation: {
      trainSize: train.length,
      testSize: test.length,
      featureCount: trainMatrix.featureNames.length,
    },
  };
};

module.exports = { trainModels };
