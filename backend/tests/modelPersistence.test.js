process.env.MIN_TRAINING_RECORDS = process.env.MIN_TRAINING_RECORDS || '8';
process.env.MIN_SAMPLES_PER_CLASS = process.env.MIN_SAMPLES_PER_CLASS || '2';
process.env.MIN_TEST_SAMPLES = process.env.MIN_TEST_SAMPLES || '1';
process.env.TEST_SIZE = process.env.TEST_SIZE || '0.2';
const test = require('node:test');
const assert = require('node:assert/strict');
const { MongoMemoryServer } = require('mongodb-memory-server');
const User = require('../src/models/User');
const Product = require('../src/models/Product');
const Session = require('../src/models/Session');
const Order = require('../src/models/Order');
const TrainedModel = require('../src/ai/models/TrainedModel');
const { generateDataset } = require('../src/ai/services/datasetBuilderService');
const { trainModels } = require('../src/ai/services/modelTrainingService');
const { predictFromFeatures } = require('../src/ai/services/predictionService');

test('trained model save/load produces consistent prediction', async () => {
  const mongod = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongod.getUri();
  const { connectDB } = require('../src/config/db');
  await connectDB();

  const admin = await User.create({ name: 'Admin', email: 'admin@example.com', password: 'hashed', role: 'admin' });
  const customer = await User.create({ name: 'Customer', email: 'customer@example.com', password: 'hashed', role: 'customer' });
  const product = await Product.create({ name: 'Widget', description: 'test', price: 10, stock: 5, category: 'electronics' });

  // create minimal sessions and orders
  for (let i = 1; i <= 8; i++) {
    const started = new Date('2024-01-0' + i + 'T10:00:00Z');
    await Session.create({ user: customer._id, sessionId: 's-' + i, status: 'ended', startedAt: started, endedAt: new Date(started.getTime() + 600000), events: [{ type: 'product_view', productId: product._id, createdAt: new Date(started.getTime() + 60000) }], cartUpdates: [{ action: 'add_to_cart', productId: product._id, quantity: 1, createdAt: new Date(started.getTime() + 120000) }], checkoutSteps: i % 2 === 0 ? [{ step: 'shipping', status: 'completed' }] : [], paymentAttempts: i % 2 === 0 ? [{ status: 'success' }] : [] });
    if (i % 2 === 0) {
      const Cart = require('../src/models/Cart');
      const cart = await Cart.create({ user: customer._id, items: [{ product: product._id, quantity: 1, price: product.price }], subtotal: product.price });
      // create order within the session window (e.g., 7 minutes after start)
      await Order.create({ user: customer._id, cart: cart._id, items: [{ product: product._id, quantity: 1, price: product.price }], totalAmount: product.price, status: 'paid', createdAt: new Date(started.getTime() + 7 * 60 * 1000) });
    }
  }

  const dataset = await generateDataset({ createdBy: admin._id, maxSessions: 20 });
  const trainingResult = await trainModels({ dataset, datasetVersion: dataset.datasetVersion, version: 'persistence-test', createdBy: admin._id });
  const best = trainingResult.bestModel;

  const saved = await TrainedModel.create({ modelName: best.modelType, modelType: best.modelType, datasetVersion: dataset.datasetVersion, datasetId: dataset._id, version: 'persistence-test', trainingConfig: { trainSize: trainingResult.evaluation.trainSize, testSize: trainingResult.evaluation.testSize }, metrics: best.metrics, featureNames: best.featureNames, modelArtifacts: best.modelArtifacts, createdBy: admin._id, isActive: true });

  // pick a real session and generate features
  const session = await Session.findOne({ sessionId: 's-1' }).lean();
  const features = {
    sessionDuration: session.totalSessionSeconds || 0,
    totalEvents: Array.isArray(session.events) ? session.events.length : 0,
    pageViewCount: Array.isArray(session.pageViews) ? session.pageViews.length : 0,
    cartItemCount: Array.isArray(session.cartUpdates) ? session.cartUpdates.length : 0,
    checkoutStarted: Array.isArray(session.checkoutSteps) && session.checkoutSteps.length > 0 ? 1 : 0,
    paymentAttempts: Array.isArray(session.paymentAttempts) ? session.paymentAttempts.length : 0,
  };

  const p1 = await predictFromFeatures({ features, modelVersion: saved.version, datasetVersion: dataset.datasetVersion, sessionId: session.sessionId, userId: session.user });
  const p2 = await predictFromFeatures({ features, modelVersion: saved.version, datasetVersion: dataset.datasetVersion, sessionId: session.sessionId, userId: session.user });

  assert.strictEqual(p1.probability, p2.probability);

  await mongod.stop();
});
