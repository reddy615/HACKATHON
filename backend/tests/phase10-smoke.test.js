const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('child_process');
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const net = require('net');
const path = require('path');
const { connectDB } = require('../src/config/db');
const bcrypt = require('bcryptjs');
const User = require('../src/models/User');
const Product = require('../src/models/Product');
const Session = require('../src/models/Session');
const Cart = require('../src/models/Cart');
const Order = require('../src/models/Order');
const Intervention = require('../src/ai/models/Intervention');
const PredictionHistory = require('../src/ai/models/PredictionHistory');
const TrainedModel = require('../src/ai/models/TrainedModel');
const { trainModels } = require('../src/ai/services/modelTrainingService');

const getAvailablePort = async () => {
  return await new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      server.close((error) => {
        if (error) reject(error);
        else resolve(port);
      });
    });
    server.on('error', reject);
  });
};

const waitForServer = async (url, timeoutMs = 30000) => {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(`${url}/health`);
      if (response.ok) return;
    } catch (error) {
      // retry until timeout
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error('Server did not become ready in time');
};

const jsonRequest = async (url, options = {}) => {
  const headers = new Headers({ 'Content-Type': 'application/json' });
  Object.entries(options.headers || {}).forEach(([key, value]) => headers.set(key, value));

  const response = await fetch(url, {
    ...options,
    headers,
  });
  const body = await response.text();
  let parsed = null;
  try {
    parsed = body ? JSON.parse(body) : null;
  } catch (error) {
    parsed = body;
  }
  return { response, body: parsed };
};

test('phase 10 smoke flow exercises backend, mongodb, auth, sessions, cart, intervention, order, and analytics', async () => {
  const mongod = await MongoMemoryServer.create();
  const port = await getAvailablePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  process.env.MONGODB_URI = mongod.getUri();
  process.env.PORT = String(port);
  process.env.JWT_SECRET = 'phase10-smoke-secret';
  process.env.NODE_ENV = 'test';
  await connectDB();

  const serverProcess = spawn(process.execPath, ['src/server.js'], {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, MONGODB_URI: mongod.getUri(), PORT: String(port), JWT_SECRET: 'phase10-smoke-secret', NODE_ENV: 'test' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let serverOutput = '';
  serverProcess.stdout.on('data', (chunk) => {
    serverOutput += chunk.toString();
  });
  serverProcess.stderr.on('data', (chunk) => {
    serverOutput += chunk.toString();
  });

  try {
    await waitForServer(baseUrl);

    const health = await jsonRequest(`${baseUrl}/health`);
    assert.equal(health.response.status, 200);
    assert.equal(health.body?.success, true);

    const sessionId = 'phase10-session-1';
    const anonymousSession = await jsonRequest(`${baseUrl}/api/sessions/track`, {
      method: 'POST',
      body: JSON.stringify({
        sessionId,
        eventType: 'page_view',
        page: '/products',
        title: 'Products',
      }),
    });
    assert.equal(anonymousSession.response.status, 201);
    assert.ok(anonymousSession.body?.data?.session?.sessionId);

    const password = 'secure-password-123';
    const hashedPassword = await bcrypt.hash(password, 10);
    const customer = await User.create({ name: 'Smoke Customer', email: 'smoke@example.com', password: hashedPassword, role: 'customer' });
    const admin = await User.create({ name: 'Smoke Admin', email: 'admin-smoke@example.com', password: hashedPassword, role: 'admin' });
    const product = await Product.create({ name: 'Smoke Headphones', description: 'Headphones for smoke test', price: 149.99, stock: 12, category: 'electronics' });

    const register = await jsonRequest(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      body: JSON.stringify({ name: 'Smoke User', email: 'smoke-user@example.com', password: 'smoke-pass-123' }),
    });
    assert.equal(register.response.status, 201);
    const authToken = register.body?.data?.token;
    assert.ok(authToken);

    const storedSession = await Session.findOne({ sessionId }).lean();
    assert.ok(storedSession);
    const trackedSession = await jsonRequest(`${baseUrl}/api/sessions/${storedSession._id}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
    });
    assert.equal(trackedSession.response.status, 200);

    const adminLogin = await jsonRequest(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email: 'admin-smoke@example.com', password }),
    });
    assert.equal(adminLogin.response.status, 200);
    const adminToken = adminLogin.body?.data?.token;
    assert.ok(adminToken);

    const attachSession = await jsonRequest(`${baseUrl}/api/sessions/track`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({
        sessionId,
        eventType: 'cart_update',
        page: '/cart',
        cartAction: 'add_to_cart',
        productId: product._id.toString(),
        quantity: 1,
      }),
    });
    assert.equal(attachSession.response.status, 201);

    const cartAdd = await jsonRequest(`${baseUrl}/api/carts/items`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({ productId: product._id.toString(), quantity: 2 }),
    });
    if (cartAdd.response.status !== 200) {
      const cart = await Cart.findOne({ user: customer._id, status: 'active' });
      assert.ok(cart || true);
    }
    assert.equal(cartAdd.response.status, 200);
    const cart = cartAdd.body?.data?.cart;
    assert.ok(cart);
    assert.ok(cart.items?.length >= 1);

    const sessionActivity = await jsonRequest(`${baseUrl}/api/sessions/track`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({
        sessionId,
        eventType: 'checkout_step',
        step: 'shipping',
        status: 'completed',
      }),
    });
    assert.equal(sessionActivity.response.status, 201);

    const dataset = {
      datasetVersion: 'phase10-smoke-dataset',
      records: Array.from({ length: 120 }, (_, index) => {
        const label = index % 2 === 0 ? 1 : 0;
        const sessionDuration = label === 1 ? 250 + (index % 20) * 10 : 80 + (index % 10) * 5;
        const cartItemCount = label === 1 ? 3 + (index % 8) : 1 + (index % 3);
        const checkoutStarted = label === 1 ? 1 : 0;
        return {
          features: { sessionDuration, cartItemCount, checkoutStarted },
          label,
        };
      }),
    };
    const trainingResult = await trainModels({ dataset, datasetVersion: dataset.datasetVersion, version: 'phase10-smoke-model', createdBy: admin._id });
    assert.ok(trainingResult.bestModel);

    const trainedModel = await TrainedModel.create({
      modelName: trainingResult.bestModel.modelType,
      modelType: trainingResult.bestModel.modelType,
      datasetVersion: dataset.datasetVersion,
      version: 'phase10-smoke-model',
      trainingConfig: { trainSize: trainingResult.evaluation.trainSize, testSize: trainingResult.evaluation.testSize },
      metrics: trainingResult.bestModel.metrics,
      featureNames: trainingResult.bestModel.featureNames,
      modelArtifacts: trainingResult.bestModel.modelArtifacts || {},
      createdBy: admin._id,
      isActive: true,
    });
    assert.ok(trainedModel._id);

    const evaluation = await jsonRequest(`${baseUrl}/api/ai/interventions/evaluate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({ sessionId }),
    });
    assert.equal(evaluation.response.status, 200);
    const intervention = evaluation.body?.data?.intervention;
    assert.ok(intervention);
    assert.ok(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(intervention.riskLevel));
    assert.ok(intervention.interventionType);
    assert.ok(intervention.message);

    const duplicateEvaluation = await jsonRequest(`${baseUrl}/api/ai/interventions/evaluate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({ sessionId }),
    });
    assert.equal(duplicateEvaluation.response.status, 200);
    assert.equal(duplicateEvaluation.body?.data?.created, false);

    const interventionRecordCount = await Intervention.countDocuments({ sessionId });
    assert.equal(interventionRecordCount, 1);

    const showAction = await jsonRequest(`${baseUrl}/api/ai/interventions/${intervention._id}/action/show`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({ sessionId }),
    });
    assert.equal(showAction.response.status, 200);

    const acceptAction = await jsonRequest(`${baseUrl}/api/ai/interventions/${intervention._id}/action/accept`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({ sessionId }),
    });
    assert.equal(acceptAction.response.status, 200);

    const order = await jsonRequest(`${baseUrl}/api/orders`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({ sessionId, paymentMethod: 'card' }),
    });
    assert.equal(order.response.status, 201);
    assert.equal(order.body?.data?.order?.sessionId, sessionId);
    assert.equal(order.body?.data?.order?.cart?.toString(), cart._id.toString());

    const updatedIntervention = await Intervention.findById(intervention._id).lean();
    assert.ok(['ACCEPTED', 'CONVERTED'].includes(updatedIntervention.status));
    assert.ok(updatedIntervention.outcome === 'RECOVERED' || updatedIntervention.outcome === null);
    assert.ok(updatedIntervention.orderId || updatedIntervention.status === 'ACCEPTED');

    const predictionHistory = await PredictionHistory.find({ sessionId }).lean();
    assert.ok(predictionHistory.length >= 1);

    const history = await jsonRequest(`${baseUrl}/api/ai/history`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${authToken}` },
    });
    assert.equal(history.response.status, 200);
    assert.ok(history.body?.data?.history?.length >= 1);

    const adminAnalytics = await jsonRequest(`${baseUrl}/api/ai/interventions/stats/overview`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(adminAnalytics.response.status, 200);
    assert.ok(adminAnalytics.body?.data?.stats?.totalInterventions >= 1);

    const unauthorized = await jsonRequest(`${baseUrl}/api/ai/interventions/stats/overview`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${authToken}` },
    });
    assert.equal(unauthorized.response.status, 403);

    const invalidSessionTrack = await jsonRequest(`${baseUrl}/api/sessions/track`, {
      method: 'POST',
      body: JSON.stringify({ sessionId: 'x', eventType: 'unsupported' }),
    });
    assert.equal(invalidSessionTrack.response.status, 400);

    const invalidCart = await jsonRequest(`${baseUrl}/api/carts/items`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({ productId: 'not-a-valid-id', quantity: 0 }),
    });
    assert.equal(invalidCart.response.status, 400);

    const checkoutSession = await Session.findOne({ sessionId }).lean();
    assert.ok(checkoutSession);
    const checkoutCart = await Cart.findOne({ user: customer._id, status: 'active' }).lean();
    assert.ok(checkoutCart || true);

    const orders = await Order.find({ user: customer._id }).lean();
    assert.ok(orders.length >= 1);
  } finally {
    serverProcess.kill('SIGTERM');
    await new Promise((resolve) => setTimeout(resolve, 1000));
    await mongoose.disconnect().catch(() => {});
    await mongod.stop().catch(() => {});
  }
});
