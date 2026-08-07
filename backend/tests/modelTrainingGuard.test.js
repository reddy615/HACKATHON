process.env.MIN_TRAINING_RECORDS = process.env.MIN_TRAINING_RECORDS || '8';
process.env.MIN_SAMPLES_PER_CLASS = process.env.MIN_SAMPLES_PER_CLASS || '2';
process.env.MIN_TEST_SAMPLES = process.env.MIN_TEST_SAMPLES || '1';
process.env.TEST_SIZE = process.env.TEST_SIZE || '0.2';
const test = require('node:test');
const assert = require('node:assert/strict');
const { trainModels } = require('../src/ai/services/modelTrainingService');

test('trainModels rejects datasets that do not contain both classes', async () => {
  const dataset = {
    datasetVersion: 'invalid-dataset',
    records: [
      { features: { sessionDuration: 120, cartItemCount: 2, checkoutStarted: 0 }, label: 0 },
      { features: { sessionDuration: 180, cartItemCount: 3, checkoutStarted: 0 }, label: 0 },
      { features: { sessionDuration: 200, cartItemCount: 4, checkoutStarted: 0 }, label: 0 },
      { features: { sessionDuration: 220, cartItemCount: 5, checkoutStarted: 0 }, label: 0 },
      { features: { sessionDuration: 240, cartItemCount: 6, checkoutStarted: 0 }, label: 0 },
      { features: { sessionDuration: 260, cartItemCount: 7, checkoutStarted: 0 }, label: 0 },
    ],
  };

  await assert.rejects(() => trainModels({ dataset, datasetVersion: 'invalid-dataset', version: 'bad-model', createdBy: 'tester' }), /at least 8 records/);
});
