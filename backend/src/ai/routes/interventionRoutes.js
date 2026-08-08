const express = require('express');
const { protect, authorize } = require('../../middleware');
const {
  evaluateIntervention,
  listInterventions,
  getInterventionById,
  updateInterventionStatus,
  getInterventionStats,
  getMyInterventions,
  getSessionInterventions,
  performInterventionAction,
} = require('../controllers/interventionController');

const router = express.Router();

router.post('/interventions/evaluate', evaluateIntervention);
router.get('/interventions/stats/overview', protect, authorize('admin'), getInterventionStats);
router.get('/interventions', protect, listInterventions);
router.get('/interventions/me', protect, getMyInterventions);
router.get('/interventions/session/:sessionId', protect, getSessionInterventions);
router.get('/interventions/:id', protect, getInterventionById);
router.put('/interventions/:id/status', protect, updateInterventionStatus);
router.put('/interventions/:id/action/:action', protect, performInterventionAction);

module.exports = router;
