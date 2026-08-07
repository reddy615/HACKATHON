const { body, param, validationResult } = require("express-validator");

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: errors.array().map((error) => ({ field: error.path, message: error.msg })),
    });
  }
  next();
};

const validateRegister = [
  body("name").trim().isLength({ min: 2 }).withMessage("Name must be at least 2 characters"),
  body("email").isEmail().normalizeEmail().withMessage("Valid email is required"),
  body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
  body("role").optional().isIn(["customer", "admin"]).withMessage("Role must be customer or admin"),
  handleValidationErrors,
];

const validateLogin = [
  body("email").isEmail().normalizeEmail().withMessage("Valid email is required"),
  body("password").notEmpty().withMessage("Password is required"),
  handleValidationErrors,
];

const validateProduct = [
  body("name").trim().isLength({ min: 2 }).withMessage("Product name is required"),
  body("price").isFloat({ gt: 0 }).withMessage("Price must be greater than 0"),
  body("stock").optional().isInt({ min: 0 }),
  handleValidationErrors,
];

const validateMongoId = (paramName = "id") => [
  param(paramName).isMongoId().withMessage("Invalid id format"),
  handleValidationErrors,
];

const validateCartItem = [
  body("productId").isMongoId().withMessage("Valid product id is required"),
  body("quantity").optional().isInt({ min: 1 }).withMessage("Quantity must be at least 1"),
  handleValidationErrors,
];

const validateOrder = [
  body("paymentMethod").optional().isString().withMessage("Payment method must be a string"),
  handleValidationErrors,
];

const validateWishlistItem = [
  body("productId").isMongoId().withMessage("Valid product id is required"),
  handleValidationErrors,
];

const validateSessionTracking = [
  body("sessionId").optional().isString().isLength({ min: 3 }).withMessage("Session id must be a string with at least 3 characters"),
  body("eventType").optional().isIn(["page_view", "click", "product_view", "cart_update", "checkout_step", "payment_attempt", "custom_event"]).withMessage("Unsupported event type"),
  body("page").optional().isString().withMessage("Page must be a string"),
  body("productId").optional().isMongoId().withMessage("Product id must be a valid Mongo id"),
  body("quantity").optional().isInt({ min: 1 }).withMessage("Quantity must be at least 1"),
  handleValidationErrors,
];

module.exports = {
  validateRegister,
  validateLogin,
  validateProduct,
  validateMongoId,
  validateCartItem,
  validateOrder,
  validateWishlistItem,
  validateSessionTracking,
};
