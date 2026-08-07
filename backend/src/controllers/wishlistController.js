const User = require("../models/User");
const Product = require("../models/Product");
const { apiSuccess, apiError } = require("../utils/apiResponse");

exports.getWishlist = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).populate("wishlist");
    res.status(200).json(apiSuccess("Wishlist fetched", { wishlist: user?.wishlist || [] }));
  } catch (error) {
    next(error);
  }
};

exports.toggleWishlistItem = async (req, res, next) => {
  try {
    const { productId } = req.body;
    const product = await Product.findById(productId);
    if (!product) return res.status(404).json(apiError("Product not found", 404));

    const user = await User.findById(req.user._id);
    const exists = user.wishlist.some((id) => id.toString() === productId);

    if (exists) {
      user.wishlist = user.wishlist.filter((id) => id.toString() !== productId);
    } else {
      user.wishlist.push(product._id);
    }

    await user.save();
    await user.populate("wishlist");

    res.status(200).json(apiSuccess(exists ? "Removed from wishlist" : "Added to wishlist", { wishlist: user.wishlist }));
  } catch (error) {
    next(error);
  }
};
