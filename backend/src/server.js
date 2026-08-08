const app = require("./app");
const { connectDB } = require("./config/db");
const { env } = require("./config/env");
const logger = require("./utils/logger");

// In production we require a MongoDB connection. In development we allow running without DB
if (env.NODE_ENV === 'production') {
  if (!process.env.MONGODB_URI && !env.MONGODB_URI) {
    logger.error('MONGODB_URI must be provided in production via environment variables');
    process.exit(1);
  }
  connectDB().catch((error) => {
    logger.error(`Database connection failed: ${error.message}`);
    process.exit(1);
  });
} else {
  // development: attempt connect if URI provided, otherwise continue without DB
  if (process.env.MONGODB_URI || env.MONGODB_URI) {
    connectDB().catch((error) => {
      logger.error(`Database connection failed: ${error.message}`);
    });
  } else {
    logger.warn('MONGODB_URI not set — running without database (development only)');
  }
}

const port = process.env.PORT || env.PORT || 5000;
app.listen(port, () => {
  logger.info(`Server running on port ${port}`);
});
