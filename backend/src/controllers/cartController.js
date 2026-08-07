const Cart = require("../models/Cart");
const Product = require("../models/Product");
const { apiSuccess, apiError } = require("../utils/apiResponse");

exports.getMyCart = async (req, res, next) => {
  try {
    let cart = await Cart.findOne({ user: req.user._id, status: "active" }).populate("items.product");
    if (!cart) {
      cart = await Cart.create({ user: req.user._id, items: [], subtotal: 0 });
    }
    res.status(200).json(apiSuccess("Cart fetched", { cart }));
  } catch (error) {
    next(error);
  }
};

exports.addItemToCart = async (req, res, next) => {
  try {
    const { productId, quantity = 1 } = req.body;
    const product = await Product.findById(productId);
    if (!product) return res.status(404).json(apiError("Product not found", 404));

    let cart = await Cart.findOne({ user: req.user._id, status: "active" });
    if (!cart) {
      cart = await Cart.create({ user: req.user._id, items: [] });
    }

    const existingItem = cart.items.find((item) => item.product.toString() === productId);
    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      cart.items.push({ product: product._id, quantity, price: product.price });
    }

    cart.subtotal = cart.items.reduce((sum, item) => sum + item.quantity * item.price, 0);
    await cart.save();

    res.status(200).json(apiSuccess("Item added to cart", { cart }));
  } catch (error) {
    next(error);
  }
};

exports.updateCartItem = async (req, res, next) => {
  try {
    const { quantity } = req.body;
    const cart = await Cart.findOne({ user: req.user._id, status: "active" });
    if (!cart) return res.status(404).json(apiError("Cart not found", 404));

    const item = cart.items.id(req.params.itemId);
    if (!item) return res.status(404).json(apiError("Cart item not found", 404));

    item.quantity = quantity;
    cart.subtotal = cart.items.reduce((sum, item) => sum + item.quantity * item.price, 0);
    await cart.save();

    res.status(200).json(apiSuccess("Cart item updated", { cart }));
  } catch (error) {
    next(error);
  }
};

exports.removeCartItem = async (req, res, next) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id, status: "active" });
    if (!cart) return res.status(404).json(apiError("Cart not found", 404));

    cart.items = cart.items.filter((item) => item._id.toString() !== req.params.itemId);
    cart.subtotal = cart.items.reduce((sum, item) => sum + item.quantity * item.price, 0);
    await cart.save();

    res.status(200).json(apiSuccess("Cart item removed", { cart }));
  } catch (error) {
    next(error);
  }
};

exports.clearCart = async (req, res, next) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id, status: "active" });
    if (!cart) return res.status(404).json(apiError("Cart not found", 404));
    cart.items = [];
    cart.subtotal = 0;
    await cart.save();
    res.status(200).json(apiSuccess("Cart cleared", { cart }));
  } catch (error) {
    next(error);
  }
};
