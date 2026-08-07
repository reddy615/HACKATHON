const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { env } = require("../config/env");
const { apiSuccess, apiError } = require("../utils/apiResponse");
const logger = require("../utils/logger");

const signToken = (user) => jwt.sign({ id: user._id, role: user.role }, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN });

exports.register = async (req, res, next) => {
  try {
    const { name, email, password, role, phone } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json(apiError("Name, email, and password are required", 400));
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json(apiError("User already exists", 409));
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hashedPassword, role: role || "customer", phone: phone || "" });

    const token = signToken(user);
    logger.info(`User registered: ${user.email}`);

    res.status(201).json(apiSuccess("User registered successfully", { user: { id: user._id, name: user.name, email: user.email, role: user.role }, token }));
  } catch (error) {
    next(error);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json(apiError("Email and password are required", 400));
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json(apiError("Invalid credentials", 401));
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json(apiError("Invalid credentials", 401));
    }

    const token = signToken(user);
    logger.info(`User logged in: ${user.email}`);

    res.status(200).json(apiSuccess("Login successful", { user: { id: user._id, name: user.name, email: user.email, role: user.role }, token }));
  } catch (error) {
    next(error);
  }
};

exports.getMe = async (req, res) => {
  res.status(200).json(apiSuccess("User profile fetched", { user: req.user }));
};
