const escapeCsvValue = (value) => {
  if (value === undefined || value === null) return "";
  const stringValue = String(value);
  return /[",\n]/.test(stringValue) ? `"${stringValue.replace(/"/g, '""')}"` : stringValue;
};

const flattenFeatures = (features = {}) => {
  const flattened = {};
  Object.entries(features || {}).forEach(([key, value]) => {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      Object.entries(value).forEach(([nestedKey, nestedValue]) => {
        flattened[`${key}.${nestedKey}`] = nestedValue;
      });
    } else {
      flattened[key] = value;
    }
  });
  return flattened;
};

module.exports = { escapeCsvValue, flattenFeatures };
