const express = require("express");
const { getMyCart, addItemToCart, updateCartItem, removeCartItem, clearCart } = require("../controllers/cartController");
const { protect } = require("../middleware");
const { validateCartItem, validateMongoId } = require("../validators/common");

const router = express.Router();

/**
 * @openapi
 * /api/carts:
 *   get:
 *     summary: Get the authenticated user's cart
 *     responses:
 *       200:
 *         description: Cart fetched
 */
router.get("/", protect, getMyCart);
router.post("/items", protect, validateCartItem, addItemToCart);
router.put("/items/:itemId", protect, validateMongoId("itemId"), updateCartItem);
router.delete("/items/:itemId", protect, validateMongoId("itemId"), removeCartItem);
router.delete("/clear", protect, clearCart);

module.exports = router;
