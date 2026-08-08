const { trainModels } = require('./src/ai/services/modelTrainingService');
const TrainedModel = require('./src/ai/models/TrainedModel');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { connectDB } = require('./src/config/db');
const mongoose = require('mongoose');
(async () => {
  const mongod = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongod.getUri();
  process.env.PORT = '5021';
  process.env.JWT_SECRET = 'x';
  process.env.NODE_ENV = 'test';
  await connectDB();
  const dataset = {
    datasetVersion: 'phase10-smoke-dataset',
    records: Array.from({ length: 120 }, (_, index) => {
      const label = index % 2 === 0 ? 1 : 0;
      const sessionDuration = label === 1 ? 250 + (index % 20) * 10 : 80 + (index % 10) * 5;
      const cartItemCount = label === 1 ? 3 + (index % 8) : 1 + (index % 3);
      const checkoutStarted = label === 1 ? 1 : 0;
      return { features: { sessionDuration, cartItemCount, checkoutStarted }, label };
    }),
  };
  const trainingResult = await trainModels({ dataset, datasetVersion: dataset.datasetVersion, version: 'phase10-smoke-model', createdBy: new mongoose.Types.ObjectId() });
  await TrainedModel.create({
    modelName: trainingResult.bestModel.modelType,
    modelType: trainingResult.bestModel.modelType,
    datasetVersion: dataset.datasetVersion,
    version: 'phase10-smoke-model',
    trainingConfig: { trainSize: trainingResult.evaluation.trainSize, testSize: trainingResult.evaluation.testSize },
    metrics: trainingResult.bestModel.metrics,
    featureNames: trainingResult.bestModel.featureNames,
    modelArtifacts: trainingResult.bestModel.modelArtifacts || {},
    createdBy: new mongoose.Types.ObjectId(),
    isActive: true,
  });
  console.log(JSON.stringify(trainingResult.bestModel, null, 2));
  await mongoose.disconnect();
  await mongod.stop();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
