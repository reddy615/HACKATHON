const express = require("express");
const { protect, authorize } = require("../../middleware");
const { trainModel, listModels, getLatestModel, predict, predictFromSession, getEvaluation, getPredictionHistory } = require("../controllers/predictionController");

const router = express.Router();

router.post("/train", protect, authorize("admin"), trainModel);
router.get("/models", protect, authorize("admin"), listModels);
router.get("/models/latest", protect, authorize("admin"), getLatestModel);
router.post("/predict", protect, predict);
router.post("/predict/session/:sessionId", protect, predictFromSession);
router.get("/evaluation", protect, authorize("admin"), getEvaluation);
router.get("/history", protect, getPredictionHistory);

module.exports = router;
