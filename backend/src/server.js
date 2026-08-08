const app = require("./app");
const { connectDB } = require("./config/db");
const { env } = require("./config/env");
const logger = require("./utils/logger");

if (env.MONGODB_URI) {
  connectDB().catch((error) => {
    logger.error(`Database connection failed: ${error.message}`);
    process.exit(1);
  });
} else {
  logger.warn('MONGODB_URI not set — skipping database connection (development only)');
}

app.listen(env.PORT, () => {
  logger.info(`Server running on port ${env.PORT}`);
});
