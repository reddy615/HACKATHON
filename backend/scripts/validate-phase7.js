const { MongoMemoryServer } = require('mongodb-memory-server');

(async () => {
  const mongod = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongod.getUri();

  const { connectDB } = require('../src/config/db');
  const User = require('../src/models/User');
  const Product = require('../src/models/Product');
  const Session = require('../src/models/Session');
  const Order = require('../src/models/Order');
  const TrainingDataset = require('../src/ai/models/TrainingDataset');
  const TrainedModel = require('../src/ai/models/TrainedModel');
  const PredictionHistory = require('../src/ai/models/PredictionHistory');
  const { generateDataset, buildDatasetVersion } = require('../src/ai/services/datasetBuilderService');
  const { loadDataset } = require('../src/ai/services/datasetLoaderService');
  const { prepareDatasetRows, buildFeatureMatrix } = require('../src/ai/services/preprocessingService');
  const { trainModels } = require('../src/ai/services/modelTrainingService');
  const { predictFromFeatures } = require('../src/ai/services/predictionService');

  try {
    await connectDB();

    const admin = await User.create({ name: 'Admin', email: 'admin@example.com', password: 'hashed', role: 'admin' });
    const customer = await User.create({ name: 'Customer', email: 'customer@example.com', password: 'hashed', role: 'customer' });
    const product = await Product.create({ name: 'Widget', description: 'test', price: 10, stock: 5, category: 'electronics' });

    const sessionSpecs = [
      { sessionId: 's-1', startedAt: '2024-01-01T10:00:00Z', label: 1 },
      { sessionId: 's-2', startedAt: '2024-01-02T10:00:00Z', label: 1 },
      { sessionId: 's-3', startedAt: '2024-01-03T10:00:00Z', label: 0 },
      { sessionId: 's-4', startedAt: '2024-01-04T10:00:00Z', label: 0 },
      { sessionId: 's-5', startedAt: '2024-01-05T10:00:00Z', label: 1 },
      { sessionId: 's-6', startedAt: '2024-01-06T10:00:00Z', label: 1 },
      { sessionId: 's-7', startedAt: '2024-01-07T10:00:00Z', label: 0 },
      { sessionId: 's-8', startedAt: '2024-01-08T10:00:00Z', label: 0 },
    ];

    for (const spec of sessionSpecs) {
      const startedAt = new Date(spec.startedAt);
      const endedAt = new Date(startedAt.getTime() + 10 * 60 * 1000);
      const isPurchase = spec.label === 1;
      await Session.create({
        user: customer._id,
        sessionId: spec.sessionId,
        status: 'ended',
        startedAt,
        endedAt,
        events: [{ type: 'product_view', productId: product._id, createdAt: new Date(startedAt.getTime() + 60 * 1000) }],
        cartUpdates: [{ action: 'add_to_cart', productId: product._id, quantity: 1, createdAt: new Date(startedAt.getTime() + 2 * 60 * 1000) }],
        checkoutSteps: isPurchase ? [{ step: 'shipping', status: 'completed' }] : [],
        paymentAttempts: isPurchase ? [{ status: 'success' }] : [],
      });

      if (isPurchase) {
        // create a minimal cart to satisfy Order schema
        const Cart = require('../src/models/Cart');
        const cart = await Cart.create({ user: customer._id, items: [{ product: product._id, quantity: 1, price: product.price }], subtotal: product.price });
        await Order.create({ user: customer._id, cart: cart._id, items: [{ product: product._id, quantity: 1, price: product.price }], totalAmount: product.price, status: 'paid', createdAt: new Date(startedAt.getTime() + 7 * 60 * 1000) });
      }
    }

    const dataset = await generateDataset({ createdBy: admin._id, datasetVersion: buildDatasetVersion('phase7-validation'), maxSessions: 20 });
    const loadedDataset = await loadDataset({ datasetVersion: dataset.datasetVersion });

    const records = Array.isArray(loadedDataset?.records) ? loadedDataset.records : [];
    const featureColumns = Array.from(new Set(records.flatMap((row) => Object.keys(row.features || {}))))
      .sort();
    const targetValues = records.map((row) => Number(row.label));
    const missingValues = records.flatMap((row) => Object.entries(row.features || {}).filter(([, value]) => value === null || value === undefined || value === '')).length;
    const invalidValues = records.flatMap((row) => Object.entries(row.features || {}).filter(([, value]) => Number.isNaN(Number(value)))).length;
    const duplicateRecords = records.length - new Set(records.map((row) => `${row.sessionId}:${row.label}`)).size;

    const preparedRows = prepareDatasetRows(loadedDataset);
    const trainMatrix = buildFeatureMatrix(preparedRows.map((entry) => ({ features: entry.features, label: entry.label })));
    const trainingResult = await trainModels({ dataset: loadedDataset, datasetVersion: loadedDataset.datasetVersion, version: 'phase7-validation-model', createdBy: admin._id });

    const savedModel = await TrainedModel.create({
      modelName: trainingResult.bestModel.modelType,
      modelType: trainingResult.bestModel.modelType,
      datasetVersion: loadedDataset.datasetVersion,
      datasetId: loadedDataset._id,
      version: 'phase7-validation-model',
      trainingConfig: { trainSize: trainingResult.evaluation.trainSize, testSize: trainingResult.evaluation.testSize },
      metrics: trainingResult.bestModel.metrics,
      featureNames: trainingResult.bestModel.featureNames,
      modelArtifacts: trainingResult.bestModel.modelArtifacts,
      createdBy: admin._id,
      isActive: true,
    });

    const prediction = await predictFromFeatures({
      features: { sessionDuration: 240, cartItemCount: 3, checkoutStarted: 1 },
      modelVersion: savedModel.version,
      datasetVersion: loadedDataset.datasetVersion,
      sessionId: 's-1',
      userId: customer._id,
    });

    const historyCount = await PredictionHistory.countDocuments();
    const latestModel = await TrainedModel.findOne({ isActive: true }).sort({ trainedAt: -1 }).lean();

    console.log(JSON.stringify({
      mongoUri: process.env.MONGODB_URI,
      datasetVersion: loadedDataset.datasetVersion,
      recordCount: records.length,
      purchasedSessions: loadedDataset.purchasedSessions,
      abandonedSessions: loadedDataset.abandonedSessions,
      featureColumns: featureColumns.slice(0, 10),
      targetValues,
      missingValues,
      invalidValues,
      duplicateRecords,
      preprocessing: {
        preparedRows: preparedRows.length,
        featureCount: trainMatrix.featureNames.length,
      },
      training: {
        modelVersion: savedModel.version,
        metrics: trainingResult.bestModel.metrics,
        models: trainingResult.models.map((model) => ({ modelType: model.modelType, metrics: model.metrics })),
      },
      prediction,
      historyCount,
      latestModel: {
        version: latestModel?.version,
        metrics: latestModel?.metrics,
      },
    }, null, 2));
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  } finally {
    await mongod.stop();
  }
})();
