const Intervention = require('../models/Intervention');
const PredictionHistory = require('../models/PredictionHistory');
const Order = require('../../models/Order');
const Cart = require('../../models/Cart');
const Session = require('../../models/Session');
const Product = require('../../models/Product');
const { buildRiskLevel } = require('../utils/mlUtils');
const { normalizeFeatureValue } = require('../utils/mlUtils');

const MIN_INTERVENTION_CONFIDENCE = Number(process.env.MIN_INTERVENTION_CONFIDENCE) || 60;
const MIN_ABANDONMENT_PROBABILITY = Number(process.env.MIN_ABANDONMENT_PROBABILITY) || 0.5;
const INTERVENTION_COOLDOWN_SECONDS = Number(process.env.INTERVENTION_COOLDOWN_SECONDS) || 900;
const MAX_INTERVENTIONS_PER_SESSION = Number(process.env.MAX_INTERVENTIONS_PER_SESSION) || 2;
const MAX_INTERVENTIONS_PER_USER = Number(process.env.MAX_INTERVENTIONS_PER_USER) || 5;
const MIN_CART_VALUE_FOR_OFFER = Number(process.env.MIN_CART_VALUE_FOR_OFFER) || 20;
const MAX_DISCOUNT_PERCENTAGE = Number(process.env.MAX_DISCOUNT_PERCENTAGE) || 20;

const validateThreshold = (value, fallback) => {
  if (!Number.isFinite(value) || value < 0) return fallback;
  return value;
};

const normalizedConfig = {
  minConfidence: validateThreshold(MIN_INTERVENTION_CONFIDENCE, 60),
  minProbability: validateThreshold(MIN_ABANDONMENT_PROBABILITY, 0.5),
  cooldownSeconds: validateThreshold(INTERVENTION_COOLDOWN_SECONDS, 900),
  maxPerSession: Math.max(1, validateThreshold(MAX_INTERVENTIONS_PER_SESSION, 2)),
  maxPerUser: Math.max(1, validateThreshold(MAX_INTERVENTIONS_PER_USER, 5)),
  minCartValueForOffer: validateThreshold(MIN_CART_VALUE_FOR_OFFER, 20),
  maxDiscountPercentage: Math.min(100, validateThreshold(MAX_DISCOUNT_PERCENTAGE, 20)),
};

const INTERVENTION_TYPES = {
  NONE: 'NONE',
  CART_REMINDER: 'CART_REMINDER',
  CHECKOUT_ASSISTANCE: 'CHECKOUT_ASSISTANCE',
  PRODUCT_RECOMMENDATION: 'PRODUCT_RECOMMENDATION',
  PERSONALIZED_MESSAGE: 'PERSONALIZED_MESSAGE',
  RECOVERY_OFFER: 'RECOVERY_OFFER',
  SUPPORT_PROMPT: 'SUPPORT_PROMPT',
};

const STATUS_TRANSITIONS = {
  PENDING: ['TRIGGERED', 'FAILED', 'EXPIRED'],
  TRIGGERED: ['DELIVERED', 'FAILED', 'EXPIRED'],
  DELIVERED: ['VIEWED', 'CLICKED', 'DISMISSED', 'EXPIRED'],
  VIEWED: ['CLICKED', 'CONVERTED', 'DISMISSED', 'EXPIRED'],
  CLICKED: ['CONVERTED', 'DISMISSED', 'EXPIRED'],
  CONVERTED: [],
  DISMISSED: [],
  EXPIRED: [],
  FAILED: [],
};

const normalizeRisk = (riskLevel) => {
  const normalized = String(riskLevel || '').toUpperCase();
  if (['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(normalized)) return normalized;
  return 'LOW';
};

const normalizeStatus = (status) => {
  const normalized = String(status || '').toUpperCase();
  return Object.keys(STATUS_TRANSITIONS).includes(normalized) ? normalized : 'PENDING';
};

const getInterventionPriority = (riskLevel) => {
  if (riskLevel === 'CRITICAL') return 'CRITICAL';
  if (riskLevel === 'HIGH') return 'HIGH';
  if (riskLevel === 'MEDIUM') return 'MEDIUM';
  return 'LOW';
};

const getInterventionType = ({ riskLevel, cartValue, paymentStatus, sessionActivity, productRecommendations }) => {
  if (riskLevel === 'CRITICAL') {
    if (paymentStatus === 'failed') return INTERVENTION_TYPES.CHECKOUT_ASSISTANCE;
    if (cartValue >= normalizedConfig.minCartValueForOffer) return INTERVENTION_TYPES.RECOVERY_OFFER;
    return INTERVENTION_TYPES.CART_REMINDER;
  }

  if (riskLevel === 'HIGH') {
    if (productRecommendations && productRecommendations.products?.length > 0) return INTERVENTION_TYPES.PRODUCT_RECOMMENDATION;
    if (paymentStatus === 'failed') return INTERVENTION_TYPES.CHECKOUT_ASSISTANCE;
    return INTERVENTION_TYPES.PERSONALIZED_MESSAGE;
  }

  if (riskLevel === 'MEDIUM') {
    if (productRecommendations && productRecommendations.products?.length > 0) return INTERVENTION_TYPES.PRODUCT_RECOMMENDATION;
    return INTERVENTION_TYPES.PERSONALIZED_MESSAGE;
  }

  return INTERVENTION_TYPES.NONE;
};

const getSessionCartValue = (cart) => {
  if (!cart || !Array.isArray(cart.items)) return 0;
  return cart.items.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0);
};

const getDeliveryEstimate = (session) => {
  if (!session) return null;
  const checkoutStep = Array.isArray(session.checkoutSteps) ? session.checkoutSteps[session.checkoutSteps.length - 1] : null;
  if (checkoutStep?.step && checkoutStep?.status === 'completed') return 1;
  return null;
};

const getPaymentStatus = (session, cart) => {
  if (!session) return 'unknown';
  const lastPayment = Array.isArray(session.paymentAttempts) ? session.paymentAttempts[session.paymentAttempts.length - 1] : null;
  if (lastPayment?.status) {
    const status = String(lastPayment.status).toLowerCase();
    if (['paid', 'success', 'completed'].includes(status)) return 'paid';
    if (['failed', 'declined', 'error', 'pending'].includes(status)) return 'failed';
  }
  if (cart?.status === 'checked_out') return 'paid';
  return 'unknown';
};

const getSessionActivity = (session) => ({
  pageViews: Array.isArray(session.pageViews) ? session.pageViews.length : 0,
  cartUpdates: Array.isArray(session.cartUpdates) ? session.cartUpdates.length : 0,
  checkoutSteps: Array.isArray(session.checkoutSteps) ? session.checkoutSteps.length : 0,
  paymentAttempts: Array.isArray(session.paymentAttempts) ? session.paymentAttempts.length : 0,
  timeOnSiteSeconds: Number(session.totalSessionSeconds || 0),
});

const getCustomerHistory = async (userId) => {
  if (!userId) return { totalOrders: 0, abandonments: 0, recoveries: 0, couponRedemptions: 0 };
  const [ordersCount, recoveries] = await Promise.all([
    Order.countDocuments({ userId }),
    Intervention.countDocuments({ userId, outcome: 'RECOVERED' }),
  ]);
  return {
    totalOrders: ordersCount,
    abandonments: 0,
    recoveries,
    couponRedemptions: 0,
  };
};

const ACTIVE_STATUSES = ['PENDING', 'TRIGGERED', 'DELIVERED', 'VIEWED', 'CLICKED'];

const findActiveIntervention = async ({ sessionId, userId }) => {
  const baseQuery = { status: { $in: ACTIVE_STATUSES } };

  if (sessionId && userId) {
    const sessionIntervention = await Intervention.findOne({ ...baseQuery, sessionId, userId })
      .sort({ createdAt: -1 })
      .lean();
    if (sessionIntervention) return sessionIntervention;
    return Intervention.findOne({ ...baseQuery, userId }).sort({ createdAt: -1 }).lean();
  }

  if (sessionId) {
    return Intervention.findOne({ ...baseQuery, sessionId }).sort({ createdAt: -1 }).lean();
  }

  if (userId) {
    return Intervention.findOne({ ...baseQuery, userId }).sort({ createdAt: -1 }).lean();
  }

  return null;
};

const findRecentInterventions = async ({ sessionId, userId }) => {
  const query = { $or: [] };
  if (sessionId) query.$or.push({ sessionId });
  if (userId) query.$or.push({ userId });
  if (!query.$or.length) return [];
  return Intervention.find(query).sort({ createdAt: -1 }).limit(10).lean();
};

const shouldCreateIntervention = ({ probability, confidence, riskLevel, recentInterventions, sessionId, userId }) => {
  const now = new Date();
  const validRecent = recentInterventions.filter((intervention) => {
    if (intervention.status === 'CONVERTED' || intervention.status === 'FAILED' || intervention.status === 'DISMISSED' || intervention.status === 'EXPIRED') {
      return false;
    }
    const ageSeconds = (now - new Date(intervention.createdAt)) / 1000;
    return ageSeconds <= normalizedConfig.cooldownSeconds;
  });

  const sessionCount = recentInterventions.filter((intervention) => intervention.sessionId === sessionId).length;
  const userCount = recentInterventions.filter((intervention) => String(intervention.userId) === String(userId)).length;

  if (sessionCount >= normalizedConfig.maxPerSession) return { allow: false, reason: 'maximum interventions per session reached' };
  if (userCount >= normalizedConfig.maxPerUser) return { allow: false, reason: 'maximum interventions per user reached' };
  if (confidence < normalizedConfig.minConfidence) return { allow: false, reason: 'confidence below threshold' };
  if (probability < normalizedConfig.minProbability) return { allow: false, reason: 'abandonment probability below threshold' };
  if (riskLevel === 'LOW') return { allow: false, reason: 'low risk does not warrant intervention' };
  if (validRecent.some((intervention) => intervention.status === 'PENDING' || intervention.status === 'TRIGGERED' || intervention.status === 'DELIVERED' || intervention.status === 'VIEWED' || intervention.status === 'CLICKED')) {
    return { allow: false, reason: 'recent active intervention still in progress' };
  }

  return { allow: true, reason: 'intervention allowed' };
};

const getProductRecommendations = async ({ session, cart, userId }) => {
  if (!session) return { products: [], reason: 'No session available for recommendation' };

  const viewedProductIds = Array.from(new Set(
    (session.events || [])
      .filter((e) => e.productId)
      .map((e) => String(e.productId))
  ));

  const cartProductIds = Array.from(new Set((cart?.items || []).map((item) => String(item.product))));
  const wishlistIds = userId ? await Product.find({}).where('_id').in([]).lean().then(() => []) : []; // placeholder safe fallback

  const excludedIds = new Set([...viewedProductIds, ...cartProductIds, ...wishlistIds]);
  const categoryCandidates = Array.from(new Set(
    (session.events || [])
      .filter((e) => e.productId)
      .map((e) => e.productId)
  ));

  const query = { isActive: true, stock: { $gt: 0 } };
  if (excludedIds.size) query._id = { $nin: Array.from(excludedIds) };

  const products = await Product.find(query).sort({ createdAt: -1 }).limit(6).lean();
  return {
    products,
    reason: products.length
      ? 'Recommended products based on customer behavior and available catalog.'
      : 'No eligible products available from the current catalog.',
    generatedAt: new Date(),
  };
};

const createIntervention = async ({ prediction, sessionId, userId, cart }) => {
  const session = await Session.findOne({ sessionId }).lean();
  const cartDoc = cart || (userId ? await Cart.findOne({ user: userId, status: 'active' }).lean() : null);
  const cartValue = getSessionCartValue(cartDoc);
  const paymentStatus = getPaymentStatus(session, cartDoc);
  const deliveryEstimate = getDeliveryEstimate(session);
  const sessionActivity = getSessionActivity(session);
  const productRecommendations = await getProductRecommendations({ session, cart: cartDoc, userId });
  const riskLevel = normalizeRisk(prediction.riskLevel);
  const priority = getInterventionPriority(riskLevel);
  const recentInterventions = await findRecentInterventions({ sessionId, userId });
  const decision = shouldCreateIntervention({ probability: prediction.probability, confidence: prediction.confidence, riskLevel, recentInterventions, sessionId, userId });

  if (!decision.allow) {
    return {
      shouldIntervene: false,
      reason: decision.reason,
      decision,
    };
  }

  const interventionType = getInterventionType({
    riskLevel,
    cartValue,
    paymentStatus,
    sessionActivity,
    productRecommendations,
  });

  if (interventionType === INTERVENTION_TYPES.NONE) {
    return {
      shouldIntervene: false,
      reason: 'No appropriate intervention type selected for current risk and state.',
      decision,
    };
  }

  const predictionId = prediction._id || prediction.historyId || null;
  const intervention = await Intervention.create({
    sessionId,
    userId,
    predictionId,
    modelVersion: prediction.modelVersion,
    interventionType,
    riskLevel,
    abandonmentProbability: prediction.probability,
    confidence: prediction.confidence,
    priority,
    reason: `Auto-generated intervention for ${riskLevel} risk and probability ${prediction.probability.toFixed(2)}.`,
    status: 'TRIGGERED',
    payload: {
      productRecommendations,
      paymentStatus,
      cartValue,
      deliveryEstimate,
      sessionActivity,
    },
    cartId: cartDoc?._id,
  });

  return {
    shouldIntervene: true,
    intervention,
    productRecommendations,
  };
};

const triggerIntervention = async (interventionId) => {
  const intervention = await Intervention.findById(interventionId);
  if (!intervention) throw new Error('Intervention not found');

  if (!STATUS_TRANSITIONS[intervention.status].includes('TRIGGERED')) {
    throw new Error(`Invalid transition from ${intervention.status} to TRIGGERED`);
  }

  intervention.status = 'TRIGGERED';
  await intervention.save();
  return intervention;
};

const updateInterventionStatus = async (interventionId, nextStatus) => {
  const status = normalizeStatus(nextStatus);
  const intervention = await Intervention.findById(interventionId);
  if (!intervention) throw new Error('Intervention not found');

  if (!STATUS_TRANSITIONS[intervention.status].includes(status)) {
    throw new Error(`Invalid transition from ${intervention.status} to ${status}`);
  }

  intervention.status = status;
  if (status === 'TRIGGERED') {
    intervention.deliveredAt = intervention.deliveredAt || new Date();
  }
  if (status === 'DELIVERED') {
    intervention.deliveredAt = intervention.deliveredAt || new Date();
  }
  if (status === 'VIEWED' || status === 'CLICKED') {
    intervention.interactedAt = new Date();
  }
  if (status === 'CONVERTED') {
    intervention.convertedAt = new Date();
    intervention.outcome = 'RECOVERED';
  }
  if (status === 'DISMISSED') {
    intervention.expiredAt = new Date();
    intervention.outcome = 'DISMISSED';
  }
  if (status === 'EXPIRED') {
    intervention.expiredAt = new Date();
    intervention.outcome = 'EXPIRED';
  }
  if (status === 'FAILED') {
    intervention.outcome = 'FAILED';
  }

  await intervention.save();
  return intervention;
};

const calculateInterventionStats = async () => {
  const total = await Intervention.countDocuments();
  const statuses = await Intervention.aggregate([
    { $group: { _id: '$status', count: { $sum: 1 } } }],
  );
  const statusMap = statuses.reduce((acc, item) => ({ ...acc, [item._id]: item.count }), {});
  const converted = statusMap.CONVERTED || 0;
  const recovered = await Intervention.countDocuments({ outcome: 'RECOVERED' });
  const avgCartValueResult = await Intervention.aggregate([
    { $match: { cartId: { $exists: true, $ne: null } } },
    { $lookup: { from: 'carts', localField: 'cartId', foreignField: '_id', as: 'cart' } },
    { $unwind: { path: '$cart', preserveNullAndEmptyArrays: true } },
    { $group: { _id: null, averageCartValue: { $avg: '$cart.subtotal' }, recoveredCartValue: { $sum: { $cond: [{ $eq: ['$outcome', 'RECOVERED'] }, '$cart.subtotal', 0] } } } },
  ]);
  const typeBreakdown = await Intervention.aggregate([
    { $group: { _id: '$interventionType', count: { $sum: 1 } } },
  ]);
  const riskBreakdown = await Intervention.aggregate([
    { $group: { _id: '$riskLevel', count: { $sum: 1 } } },
  ]);
  const eta = avgCartValueResult[0] || { averageCartValue: 0, recoveredCartValue: 0 };

  return {
    totalInterventions: total,
    statusCounts: statusMap,
    recoveredInterventions: recovered,
    conversionRate: total > 0 ? Number((converted / total).toFixed(4)) : 0,
    recoveryRate: total > 0 ? Number((recovered / total).toFixed(4)) : 0,
    averageCartValue: Number(eta.averageCartValue || 0),
    recoveredCartValue: Number(eta.recoveredCartValue || 0),
    interventionTypeCounts: typeBreakdown.reduce((acc, item) => ({ ...acc, [item._id]: item.count }), {}),
    riskLevelCounts: riskBreakdown.reduce((acc, item) => ({ ...acc, [item._id]: item.count }), {}),
  };
};

const markInterventionRecovered = async (interventionId, metadata = {}) => {
  if (!interventionId) return null;
  const intervention = await Intervention.findById(interventionId);
  if (!intervention) return null;
  intervention.status = 'CONVERTED';
  intervention.outcome = 'RECOVERED';
  intervention.convertedAt = new Date();
  intervention.recoveryMetadata = { ...intervention.recoveryMetadata, ...metadata };
  await intervention.save();
  return intervention;
};

module.exports = {
  Intervention,
  INTERVENTION_TYPES,
  STATUS_TRANSITIONS,
  normalizedConfig,
  createIntervention,
  triggerIntervention,
  updateInterventionStatus,
  findRecentInterventions,
  findActiveIntervention,
  calculateInterventionStats,
  getProductRecommendations,
  markInterventionRecovered,
};
