const fs = require("fs");
const path = require("path");

const ensureDir = (targetPath) => {
  fs.mkdirSync(targetPath, { recursive: true });
};

const getModelStoragePath = (modelVersion) => path.join(__dirname, "..", "saved-models", `${modelVersion}.json`);

const normalizeFeatureValue = (value) => {
  if (value === null || value === undefined || value === "") return 0;
  if (typeof value === "number") return value;
  if (typeof value === "boolean") return value ? 1 : 0;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return 0;
    const numeric = Number(trimmed);
    return Number.isFinite(numeric) ? numeric : 0;
  }
  return 0;
};

const transformFeaturesToVector = (features = {}) => {
  const flatFeatures = {};
  Object.entries(features || {}).forEach(([key, value]) => {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      Object.entries(value).forEach(([nestedKey, nestedValue]) => {
        flatFeatures[`${key}.${nestedKey}`] = normalizeFeatureValue(nestedValue);
      });
    } else {
      flatFeatures[key] = normalizeFeatureValue(value);
    }
  });
  return flatFeatures;
};

const buildRiskLevel = (probability) => {
  const normalized = Number(probability || 0);
  if (normalized >= 0.75) return "HIGH";
  if (normalized >= 0.4) return "MEDIUM";
  return "LOW";
};

const roundMetric = (value) => Number((value || 0).toFixed(4));

module.exports = {
  ensureDir,
  getModelStoragePath,
  normalizeFeatureValue,
  transformFeaturesToVector,
  buildRiskLevel,
  roundMetric,
};
