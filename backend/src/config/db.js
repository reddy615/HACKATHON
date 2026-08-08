const mongoose = require("mongoose");
const { env } = require("./env");
const logger = require("../utils/logger");

async function connectDB() {
  const mongoUri = process.env.MONGODB_URI || env.MONGODB_URI;

  if (!mongoUri) {
    throw new Error("MONGODB_URI is not defined");
  }

  await mongoose.connect(mongoUri, {
    autoIndex: true,
  });

  logger.info("MongoDB connected successfully");
}

module.exports = { connectDB };
