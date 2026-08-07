const express = require("express");
const { createProduct, getProducts, getProductById, updateProduct, deleteProduct } = require("../controllers/productController");
const { protect, authorize } = require("../middleware");
const { validateProduct, validateMongoId } = require("../validators/common");

const router = express.Router();

/**
 * @openapi
 * /api/products:
 *   get:
 *     summary: List active products
 *     responses:
 *       200:
 *         description: Products fetched
 */
router.get("/", getProducts);
router.get("/:id", validateMongoId("id"), getProductById);
router.post("/", protect, authorize("admin"), validateProduct, createProduct);
router.put("/:id", protect, authorize("admin"), validateMongoId("id"), validateProduct, updateProduct);
router.delete("/:id", protect, authorize("admin"), validateMongoId("id"), deleteProduct);

module.exports = router;
