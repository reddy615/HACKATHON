const { apiSuccess, apiError } = require('../../utils/apiResponse');
const Session = require('../../models/Session');
const Intervention = require('../models/Intervention');
const { predictFromFeatures } = require('../services/predictionService');
const {
  createIntervention,
  updateInterventionStatus,
  calculateInterventionStats,
} = require('../services/interventionDecisionService');

const buildSessionFeatures = (session) => {
  const pageViewCount = Array.isArray(session.pageViews) ? session.pageViews.length : 0;
  const cartUpdates = Array.isArray(session.cartUpdates) ? session.cartUpdates : [];
  const checkoutSteps = Array.isArray(session.checkoutSteps) ? session.checkoutSteps : [];
  const paymentAttempts = Array.isArray(session.paymentAttempts) ? session.paymentAttempts : [];
  const totalEvents = Array.isArray(session.events) ? session.events.length : 0;
  const cartItemCount = cartUpdates.reduce((sum, update) => sum + Number(update?.quantity || 0), 0);

  const explicitDuration = Number(session.totalSessionSeconds || 0);
  const derivedDuration = pageViewCount * 35 + cartUpdates.length * 60 + checkoutSteps.length * 90 + paymentAttempts.length * 45 + Math.max(0, totalEvents - 1) * 10;
  const sessionDuration = Math.max(explicitDuration, derivedDuration);

  return {
    sessionDuration,
    totalEvents,
    pageViewCount,
    cartItemCount: Math.max(cartItemCount, cartUpdates.length),
    checkoutStarted: checkoutSteps.length > 0 ? 1 : 0,
    paymentAttempts: paymentAttempts.length,
  };
};

const verifySessionAccess = (session, user) => {
  if (!session) return false;
  if (!session.user) return true;
  if (!user) return false;
  return user.role === 'admin' || String(session.user) === String(user._id);
};

const getSessionOwnerError = (session, user) => {
  if (!session.user) return null;
  if (!user) return 'Session is tied to a user and authentication is required';
  if (user.role === 'admin') return null;
  if (String(session.user) !== String(user._id)) return 'Forbidden';
  return null;
};

exports.evaluateIntervention = async (req, res, next) => {
  try {
    const sessionId = req.body.sessionId;
    if (!sessionId) return res.status(400).json(apiError('sessionId is required', 400));

    const session = await Session.findOne({ sessionId }).lean();
    if (!session) return res.status(404).json(apiError('Session not found', 404));

    const ownerError = getSessionOwnerError(session, req.user);
    if (ownerError) {
      return res.status(ownerError === 'Forbidden' ? 403 : 401).json(apiError(ownerError, ownerError === 'Forbidden' ? 403 : 401));
    }

    const features = req.body.features || buildSessionFeatures(session);
    const prediction = await predictFromFeatures({
      features,
      sessionId,
      userId: session.user,
    });

    const interventionResult = await createIntervention({
      prediction,
      sessionId,
      userId: session.user,
    });

    res.status(200).json(apiSuccess('Intervention evaluation completed', {
      prediction,
      intervention: interventionResult.intervention || null,
      decision: interventionResult.decision || null,
      created: interventionResult.shouldIntervene || false,
    }));
  } catch (error) {
    next(error);
  }
};

exports.listInterventions = async (req, res, next) => {
  try {
    const filters = {};
    if (req.user?.role !== 'admin') {
      filters.userId = req.user._id;
    }
    if (req.query.sessionId) {
      filters.sessionId = req.query.sessionId;
    }
    if (req.query.status) {
      filters.status = req.query.status.toUpperCase();
    }
    if (req.query.interventionType) {
      filters.interventionType = req.query.interventionType;
    }

    const interventions = await Intervention.find(filters).sort({ createdAt: -1 }).limit(200).lean();
    res.status(200).json(apiSuccess('Interventions fetched', { interventions }));
  } catch (error) {
    next(error);
  }
};

exports.getMyInterventions = async (req, res, next) => {
  try {
    const interventions = await Intervention.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(100).lean();
    res.status(200).json(apiSuccess('Your interventions fetched', { interventions }));
  } catch (error) {
    next(error);
  }
};

exports.getSessionInterventions = async (req, res, next) => {
  try {
    const sessionId = req.params.sessionId;
    const session = await Session.findOne({ sessionId }).lean();
    if (!session) return res.status(404).json(apiError('Session not found', 404));

    const ownerError = getSessionOwnerError(session, req.user);
    if (ownerError) {
      return res.status(ownerError === 'Forbidden' ? 403 : 401).json(apiError(ownerError, ownerError === 'Forbidden' ? 403 : 401));
    }

    const interventions = await Intervention.find({ sessionId }).sort({ createdAt: -1 }).lean();
    res.status(200).json(apiSuccess('Session interventions fetched', { interventions }));
  } catch (error) {
    next(error);
  }
};

const canAccessIntervention = (intervention, user) => {
  if (!intervention) return false;
  if (user?.role === 'admin') return true;
  if (intervention.userId) {
    return user && String(intervention.userId) === String(user._id);
  }
  return true;
};

exports.getInterventionById = async (req, res, next) => {
  try {
    const intervention = await Intervention.findById(req.params.id).lean();
    if (!intervention) return res.status(404).json(apiError('Intervention not found', 404));

    if (!canAccessIntervention(intervention, req.user)) {
      return res.status(403).json(apiError('Forbidden', 403));
    }

    res.status(200).json(apiSuccess('Intervention fetched', { intervention }));
  } catch (error) {
    next(error);
  }
};

const getActionStatus = (action) => {
  const mapping = {
    show: 'DELIVERED',
    view: 'VIEWED',
    click: 'CLICKED',
    accept: 'ACCEPTED',
    reject: 'REJECTED',
    dismiss: 'REJECTED',
    expire: 'EXPIRED',
  };
  return mapping[action?.toLowerCase()] || null;
};

const authorizeInterventionAction = (intervention, user, sessionId) => {
  if (user?.role === 'admin') return true;
  if (intervention.userId && user) {
    return String(intervention.userId) === String(user._id);
  }
  if (!intervention.userId && intervention.sessionId && sessionId) {
    return intervention.sessionId === sessionId;
  }
  return false;
};

exports.performInterventionAction = async (req, res, next) => {
  try {
    const interventionId = req.params.id;
    const action = req.params.action;
    const sessionId = req.body.sessionId || req.query.sessionId;
    const nextStatus = getActionStatus(action);

    if (!nextStatus) return res.status(400).json(apiError('Unsupported intervention action', 400));

    const intervention = await Intervention.findById(interventionId);
    if (!intervention) return res.status(404).json(apiError('Intervention not found', 404));

    if (!authorizeInterventionAction(intervention, req.user, sessionId)) {
      return res.status(403).json(apiError('Forbidden', 403));
    }

    const updated = await updateInterventionStatus(interventionId, nextStatus);
    res.status(200).json(apiSuccess('Intervention action applied', { intervention: updated }));
  } catch (error) {
    next(error);
  }
};

exports.updateInterventionStatus = async (req, res, next) => {
  try {
    const interventionId = req.params.id;
    const nextStatus = req.body.status;
    if (!nextStatus) return res.status(400).json(apiError('status is required', 400));

    const intervention = await Intervention.findById(interventionId);
    if (!intervention) return res.status(404).json(apiError('Intervention not found', 404));

    if (req.user?.role !== 'admin' && String(intervention.userId) !== String(req.user._id)) {
      return res.status(403).json(apiError('Forbidden', 403));
    }

    const updated = await updateInterventionStatus(interventionId, nextStatus);
    res.status(200).json(apiSuccess('Intervention status updated', { intervention: updated }));
  } catch (error) {
    next(error);
  }
};

exports.getInterventionStats = async (req, res, next) => {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json(apiError('Only admin users may view intervention analytics', 403));
    }

    const stats = await calculateInterventionStats();
    res.status(200).json(apiSuccess('Intervention stats fetched', { stats }));
  } catch (error) {
    next(error);
  }
};
