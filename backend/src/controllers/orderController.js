const Order = require("../models/Order");
const Cart = require("../models/Cart");
const Session = require("../models/Session");
const { apiSuccess, apiError } = require("../utils/apiResponse");
const { findActiveIntervention, markInterventionRecovered } = require("../ai/services/interventionDecisionService");

exports.createOrder = async (req, res, next) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id, status: "active" }).populate("items.product");
    if (!cart || cart.items.length === 0) return res.status(400).json(apiError("Cart is empty", 400));

    const requestedSessionId = req.body.sessionId;
    let sessionId = null;

    if (requestedSessionId) {
      const session = await Session.findOne({ sessionId: requestedSessionId }).lean();
      if (session && session.user && String(session.user) !== String(req.user._id)) {
        return res.status(403).json(apiError("Session does not belong to the current user", 403));
      }
      sessionId = requestedSessionId;
    }

    if (!sessionId) {
      sessionId = (await Session.findOne({ user: req.user._id, status: "active" }).sort({ updatedAt: -1 }).select("sessionId").lean())?.sessionId || null;
    }

    const totalAmount = cart.items.reduce((sum, item) => sum + item.quantity * item.price, 0);
    const paymentMethod = req.body.paymentMethod || "card";

    const activeIntervention = await findActiveIntervention({ sessionId, userId: req.user._id });

    const order = await Order.create({
      user: req.user._id,
      sessionId,
      cart: cart._id,
      interventionId: activeIntervention?._id || null,
      recoverySource: activeIntervention ? `AI_${activeIntervention.interventionType}` : null,
      items: cart.items.map((item) => ({ product: item.product, quantity: item.quantity, price: item.price })),
      totalAmount,
      paymentMethod,
      status: "paid",
    });

    if (activeIntervention) {
      await markInterventionRecovered(activeIntervention._id, {
        orderId: order._id,
        totalAmount,
        paymentMethod,
        recoveredAt: new Date(),
      });
    }

    cart.status = "checked_out";
    cart.items = [];
    cart.subtotal = 0;
    await cart.save();

    res.status(201).json(
      apiSuccess("Order created successfully", {
        order,
        payment: {
          method: paymentMethod,
          status: "simulated",
          amount: totalAmount,
        },
      })
    );
  } catch (error) {
    next(error);
  }
};

exports.getMyOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.status(200).json(apiSuccess("Orders fetched", { orders }));
  } catch (error) {
    next(error);
  }
};

exports.getOrderById = async (req, res, next) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, user: req.user._id });
    if (!order) return res.status(404).json(apiError("Order not found", 404));
    res.status(200).json(apiSuccess("Order fetched", { order }));
  } catch (error) {
    next(error);
  }
};

exports.updateOrderStatus = async (req, res, next) => {
  try {
    const order = await Order.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true, runValidators: true });
    if (!order) return res.status(404).json(apiError("Order not found", 404));
    res.status(200).json(apiSuccess("Order status updated", { order }));
  } catch (error) {
    next(error);
  }
};
