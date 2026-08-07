const express = require("express");
const { createOrder, getMyOrders, getOrderById, updateOrderStatus } = require("../controllers/orderController");
const { protect, authorize } = require("../middleware");
const { validateMongoId, validateOrder } = require("../validators/common");

const router = express.Router();

/**
 * @openapi
 * /api/orders:
 *   post:
 *     summary: Create an order from the active cart
 *     responses:
 *       201:
 *         description: Order created
 */
router.post("/", protect, validateOrder, createOrder);
router.get("/me", protect, getMyOrders);
router.get("/:id", protect, validateMongoId("id"), getOrderById);
router.put("/:id/status", protect, authorize("admin"), validateMongoId("id"), updateOrderStatus);

module.exports = router;
