const jwt = require("jsonwebtoken");
const { env } = require("../config/env");
const User = require("../models/User");
const { apiError } = require("../utils/apiResponse");

const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json(apiError("Unauthorized", 401));
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return res.status(401).json(apiError("User not found", 401));
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json(apiError("Invalid or expired token", 401));
  }
};

const authorize = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json(apiError("Forbidden", 403));
  }
  next();
};

module.exports = { protect, authorize };
