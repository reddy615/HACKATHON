const express = require("express");
const {
  startSession,
  updateSession,
  trackSession,
  endSession,
  getSessionSummary,
  getMySessions,
  getAllSessions,
  getSessionHistory,
} = require("../controllers/sessionController");
const { protect, authorize } = require("../middleware");
const { validateMongoId, validateSessionTracking } = require("../validators/common");

const router = express.Router();

router.post("/start", validateSessionTracking, startSession);
router.post("/track", validateSessionTracking, trackSession);
router.put("/:sessionId", validateSessionTracking, updateSession);
router.post("/:sessionId/end", validateSessionTracking, endSession);
router.get("/me", protect, getMySessions);
router.get("/", protect, authorize("admin"), getAllSessions);
router.get("/:id/history", protect, validateMongoId("id"), getSessionHistory);
router.get("/:id", protect, validateMongoId("id"), getSessionSummary);

module.exports = router;
