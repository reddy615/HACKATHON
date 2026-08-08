const { MongoMemoryServer } = require('mongodb-memory-server');
const { connectDB } = require('./src/config/db');
const mongoose = require('mongoose');
const PredictionHistory = require('./src/ai/models/PredictionHistory');
(async () => {
  const mongod = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongod.getUri();
  process.env.PORT = '5021';
  process.env.JWT_SECRET = 'x';
  process.env.NODE_ENV = 'test';
  await connectDB();
  const userId = new mongoose.Types.ObjectId();
  await PredictionHistory.create({ sessionId: 'abc', userId, modelVersion: 'm', prediction: 'ABANDON', probability: 0.9, confidence: 90, riskLevel: 'HIGH', features: {}, timestamp: new Date() });
  const rows = await PredictionHistory.find({}).lean();
  console.log(JSON.stringify(rows, null, 2));
  await mongoose.disconnect();
  await mongod.stop();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
