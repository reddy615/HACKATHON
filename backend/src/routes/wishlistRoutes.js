const express = require("express");
const { getWishlist, toggleWishlistItem } = require("../controllers/wishlistController");
const { protect } = require("../middleware");
const { validateWishlistItem } = require("../validators/common");

const router = express.Router();

router.get("/", protect, getWishlist);
router.post("/toggle", protect, validateWishlistItem, toggleWishlistItem);

module.exports = router;
