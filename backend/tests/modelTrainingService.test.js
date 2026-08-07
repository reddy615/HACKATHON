process.env.MIN_TRAINING_RECORDS = process.env.MIN_TRAINING_RECORDS || '8';
process.env.MIN_SAMPLES_PER_CLASS = process.env.MIN_SAMPLES_PER_CLASS || '2';
process.env.MIN_TEST_SAMPLES = process.env.MIN_TEST_SAMPLES || '1';
process.env.TEST_SIZE = process.env.TEST_SIZE || '0.2';
const test = require('node:test');
const assert = require('node:assert/strict');
const { trainModels } = require('../src/ai/services/modelTrainingService');

test('trainModels learns coefficients and produces real metrics from labeled records', async () => {
  const dataset = {
    datasetVersion: 'test-dataset-v1',
    records: [
      { features: { sessionDuration: 120, cartItemCount: 2, checkoutStarted: 0 }, label: 0 },
      { features: { sessionDuration: 320, cartItemCount: 6, checkoutStarted: 1 }, label: 1 },
      { features: { sessionDuration: 90, cartItemCount: 1, checkoutStarted: 0 }, label: 0 },
      { features: { sessionDuration: 410, cartItemCount: 7, checkoutStarted: 1 }, label: 1 },
      { features: { sessionDuration: 140, cartItemCount: 3, checkoutStarted: 0 }, label: 0 },
      { features: { sessionDuration: 360, cartItemCount: 8, checkoutStarted: 1 }, label: 1 },
      { features: { sessionDuration: 150, cartItemCount: 2, checkoutStarted: 0 }, label: 0 },
      { features: { sessionDuration: 390, cartItemCount: 7, checkoutStarted: 1 }, label: 1 },
    ],
  };

  const result = await trainModels({ dataset, datasetVersion: 'test-dataset-v1', version: 'test-model-v1', createdBy: 'test-user' });

  assert.equal(result.models.length, 4);
  assert.ok(result.bestModel.metrics.accuracy >= 0 && result.bestModel.metrics.accuracy <= 1);
  assert.ok(result.bestModel.modelArtifacts?.coefficients);
  assert.ok(result.bestModel.modelArtifacts?.bias !== undefined);
  assert.ok(result.bestModel.modelArtifacts?.featureNames?.length > 0);
});
