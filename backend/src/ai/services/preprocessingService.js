const { transformFeaturesToVector } = require("../utils/mlUtils");

const prepareDatasetRows = (dataset) => {
  const rows = Array.isArray(dataset?.records) ? dataset.records : [];

  const cleanedRows = rows.filter((row) => {
    const features = row?.features || {};
    const label = Number(row?.label);
    return features && Number.isFinite(label) && (label === 0 || label === 1);
  });

  return cleanedRows.map((row) => {
    const featuresVector = transformFeaturesToVector(row.features || {});
    return {
      row,
      features: featuresVector,
      label: Number(row.label),
    };
  });
};

const splitDataset = (records, testSize = Number(process.env.TEST_SIZE) || 0.2) => {
  // Stratified split by label to preserve class balance
  const byLabel = records.reduce((acc, item) => {
    const label = Number(item.label);
    acc[label] = acc[label] || [];
    acc[label].push(item);
    return acc;
  }, {});

  const train = [];
  const test = [];

  Object.keys(byLabel).forEach((label) => {
    const group = byLabel[label];
    const shuffled = [...group].sort(() => Math.random() - 0.5);
    const splitIndex = Math.max(1, Math.floor(shuffled.length * (1 - testSize)));
    train.push(...shuffled.slice(0, splitIndex));
    test.push(...shuffled.slice(splitIndex));
  });

  // fallback: if test or train is empty, do a simple shuffle split
  if (!test.length || !train.length) {
    const shuffled = [...records].sort(() => Math.random() - 0.5);
    const splitIndex = Math.max(2, Math.floor(shuffled.length * (1 - testSize)));
    return {
      train: shuffled.slice(0, splitIndex),
      test: shuffled.slice(splitIndex),
    };
  }

  return { train, test };
};

const buildFeatureMatrix = (records) => {
  const featureNames = Array.from(new Set(records.flatMap((entry) => Object.keys(entry.features || {}))))
    .sort();

  const X = records.map((entry) => featureNames.map((name) => Number(entry.features?.[name] || 0)));
  const y = records.map((entry) => Number(entry.label));

  return { X, y, featureNames };
};

module.exports = { prepareDatasetRows, splitDataset, buildFeatureMatrix };
