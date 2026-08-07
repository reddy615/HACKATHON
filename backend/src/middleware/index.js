const { protect, authorize } = require("./auth");
const { notFound, errorHandler } = require("./errorHandler");

module.exports = {
  protect,
  authorize,
  notFound,
  errorHandler,
};
