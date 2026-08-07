const mongoose = require("mongoose");
const { env } = require("./env");
const logger = require("../utils/logger");

async function connectDB() {
  if (!env.MONGODB_URI) {
    throw new Error("MONGODB_URI is not defined");
  }

  await mongoose.connect(env.MONGODB_URI, {
    autoIndex: true,
  });

  logger.info("MongoDB connected successfully");
}

module.exports = { connectDB };
