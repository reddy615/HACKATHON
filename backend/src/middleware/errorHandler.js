const { apiError } = require("../utils/apiResponse");
const logger = require("../utils/logger");

const notFound = (req, res, next) => {
  res.status(404).json(apiError("Route not found", 404));
};

const errorHandler = (err, req, res, next) => {
  logger.error(err.message);

  const statusCode = err.statusCode || 500;
  res.status(statusCode).json(
    apiError(err.message || "Internal Server Error", statusCode, err.details || null)
  );
};

module.exports = { notFound, errorHandler };
