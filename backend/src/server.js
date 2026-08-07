const app = require("./app");
const { connectDB } = require("./config/db");
const { env } = require("./config/env");
const logger = require("./utils/logger");

connectDB().catch((error) => {
  logger.error(`Database connection failed: ${error.message}`);
  process.exit(1);
});

app.listen(env.PORT, () => {
  logger.info(`Server running on port ${env.PORT}`);
});
