const apiSuccess = (message, data = {}) => ({
  success: true,
  message,
  data,
});

const apiError = (message, statusCode = 500, details = null) => ({
  success: false,
  message,
  statusCode,
  details,
});

module.exports = { apiSuccess, apiError };
