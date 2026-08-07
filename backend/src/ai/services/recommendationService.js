const ACTIONS = {
  DO_NOTHING: 'Do Nothing',
  OFFER_COUPON: 'Offer Coupon',
  OFFER_FREE_SHIPPING: 'Offer Free Shipping',
  SUGGEST_COD: 'Suggest COD',
  RETRY_PAYMENT: 'Retry Payment',
  WHATSAPP_REMINDER: 'WhatsApp Reminder',
  EMAIL_REMINDER: 'Email Reminder',
  PUSH_NOTIFICATION: 'Push Notification',
};

const normalizeRiskScore = (value) => {
  const score = Number(value);
  if (!Number.isFinite(score)) return 0;
  if (score > 1) {
    if (score <= 100) return Math.min(1, Math.max(0, score / 100));
    return Math.min(1, score / 1000);
  }
  return Math.min(1, Math.max(0, score));
};

const normalizePaymentStatus = (value) => {
  if (!value || typeof value !== 'string') return 'unknown';
  const normalized = value.toLowerCase().trim();
  if (['paid', 'completed', 'success', 'succeeded'].includes(normalized)) return 'paid';
  if (['failed', 'failed_payment', 'declined', 'error', 'pending', 'unpaid'].includes(normalized)) return 'failed';
  if (['cod', 'cashondelivery', 'cash_on_delivery'].includes(normalized)) return 'cod';
  return 'unknown';
};

const normalizeDeliveryEstimate = (estimate) => {
  const numeric = Number(estimate);
  if (!Number.isFinite(numeric)) return null;
  return Math.max(0, numeric);
};

const normalizeCartValue = (value) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric >= 0 ? numeric : 0;
};

const computeEngagementScore = (sessionActivity = {}) => {
  const pageViews = Number(sessionActivity.pageViews || 0);
  const cartUpdates = Number(sessionActivity.cartUpdates || 0);
  const checkoutSteps = Array.isArray(sessionActivity.checkoutSteps) ? sessionActivity.checkoutSteps.length : Number(sessionActivity.checkoutSteps || 0);
  const paymentAttempts = Number(sessionActivity.paymentAttempts || 0);
  const timeOnSite = Number(sessionActivity.timeOnSiteSeconds || 0);

  let score = 0;
  score += Math.min(1, pageViews / 10);
  score += Math.min(1, cartUpdates / 5);
  score += Math.min(1, checkoutSteps / 3);
  score += Math.min(1, paymentAttempts / 2);
  score += Math.min(1, timeOnSite / 300);
  return Math.min(1, score / 3);
};

const buildCustomerHistory = (customerHistory = {}) => {
  const totalOrders = Number(customerHistory.totalOrders || 0);
  const abandonments = Number(customerHistory.abandonments || 0);
  const recoveries = Number(customerHistory.recoveries || 0);
  const couponRedemptions = Number(customerHistory.couponRedemptions || 0);
  const positiveOrderRatio = totalOrders > 0 ? Math.min(1, (totalOrders - abandonments) / totalOrders) : 0;
  return { totalOrders, abandonments, recoveries, couponRedemptions, positiveOrderRatio };
};

const addRecommendation = (list, action, reason) => {
  if (!list.some((entry) => entry.action === action)) {
    list.push({ action, reason });
  }
};

const getRecommendation = ({
  riskScore,
  paymentStatus,
  cartValue,
  deliveryEstimate,
  customerHistory,
  sessionActivity,
}) => {
  const normalizedRisk = normalizeRiskScore(riskScore);
  const normalizedPayment = normalizePaymentStatus(paymentStatus);
  const normalizedCartValue = normalizeCartValue(cartValue);
  const normalizedDeliveryEstimate = normalizeDeliveryEstimate(deliveryEstimate);
  const engagementScore = computeEngagementScore(sessionActivity);
  const history = buildCustomerHistory(customerHistory);

  const recommendations = [];

  const isHighRisk = normalizedRisk >= 0.75;
  const isMediumRisk = normalizedRisk >= 0.4 && normalizedRisk < 0.75;
  const isLowRisk = normalizedRisk < 0.4;
  const isCartHighValue = normalizedCartValue >= 150;
  const isCartMediumValue = normalizedCartValue >= 50 && normalizedCartValue < 150;
  const isDeliveryDelayed = normalizedDeliveryEstimate !== null && normalizedDeliveryEstimate >= 5;
  const prefersCOD = normalizedPayment === 'cod';
  const hasPriorAbandonment = history.abandonments > 0;
  const hasPurchaseHistory = history.totalOrders > 0;
  const hasSuccessfulRecoveryHistory = history.recoveries > 0;
  const highEngagement = engagementScore >= 0.55;

  if (normalizedPayment === 'failed') {
    if (isHighRisk || isCartHighValue) {
      addRecommendation(recommendations, ACTIONS.RETRY_PAYMENT, 'Payment failed on a high-risk or high-value cart; retrying payment is the fastest recovery action.');
      addRecommendation(recommendations, ACTIONS.EMAIL_REMINDER, 'Notify the customer by email to resume checkout and correct payment details.');
      addRecommendation(recommendations, ACTIONS.WHATSAPP_REMINDER, 'High risk and failed payment indicate a direct reminder may improve conversion.');
    } else if (prefersCOD || isCartMediumValue) {
      addRecommendation(recommendations, ACTIONS.SUGGEST_COD, 'Payment failure plus moderate cart value suggests offering cash-on-delivery as a lower-friction alternative.');
      addRecommendation(recommendations, ACTIONS.EMAIL_REMINDER, 'Send an email reminder to confirm payment preferences and next steps.');
    } else {
      addRecommendation(recommendations, ACTIONS.RETRY_PAYMENT, 'Payment failure with low risk should retry payment first before broader recovery actions.');
      addRecommendation(recommendations, ACTIONS.PUSH_NOTIFICATION, 'A short push notification can alert the customer without being intrusive.');
    }
  }

  if (isHighRisk && normalizedPayment !== 'failed') {
    if (isCartHighValue || prefersCOD) {
      addRecommendation(recommendations, ACTIONS.OFFER_COUPON, 'High abandonment risk on a high-value cart indicates a coupon can incentivize completion.');
      addRecommendation(recommendations, ACTIONS.OFFER_FREE_SHIPPING, 'Offering free shipping reduces friction for a high-value purchase at risk.');
    } else {
      addRecommendation(recommendations, ACTIONS.OFFER_COUPON, 'High abandonment risk signals a targeted incentive may recover the sale.');
    }
    addRecommendation(recommendations, ACTIONS.EMAIL_REMINDER, 'Use email to provide a calm, informative recovery message for a high-risk session.');
    if (highEngagement || hasPriorAbandonment) {
      addRecommendation(recommendations, ACTIONS.WHATSAPP_REMINDER, 'High engagement or prior abandonments make a direct WhatsApp reminder useful for re-engaging quickly.');
    } else {
      addRecommendation(recommendations, ACTIONS.PUSH_NOTIFICATION, 'Push notifications help recover a high-risk session with timely visibility.');
    }
  }

  if (isMediumRisk && normalizedPayment !== 'failed') {
    if (isCartHighValue) {
      addRecommendation(recommendations, ACTIONS.OFFER_FREE_SHIPPING, 'Medium risk plus high cart value suggests reducing total cost through free shipping.');
    } else if (isDeliveryDelayed) {
      addRecommendation(recommendations, ACTIONS.OFFER_COUPON, 'A delayed delivery estimate can be softened with a coupon incentive.');
    }
    addRecommendation(recommendations, ACTIONS.EMAIL_REMINDER, 'Medium risk sessions benefit from a reminder and a small incentive.');
    if (highEngagement) {
      addRecommendation(recommendations, ACTIONS.PUSH_NOTIFICATION, 'Engaged users may respond well to a timely push notification.');
    }
  }

  if (isLowRisk && normalizedPayment !== 'failed') {
    if (hasPurchaseHistory && highEngagement) {
      addRecommendation(recommendations, ACTIONS.OFFER_FREE_SHIPPING, 'Low-risk but engaged customers with purchase history may convert with free shipping.');
      addRecommendation(recommendations, ACTIONS.EMAIL_REMINDER, 'A gentle reminder can encourage completion without overreach.');
    } else if (hasPriorAbandonment) {
      addRecommendation(recommendations, ACTIONS.EMAIL_REMINDER, 'Past abandonments suggest staying in touch with a reminder to prevent another drop-off.');
    } else {
      addRecommendation(recommendations, ACTIONS.DO_NOTHING, 'Low abandonment risk and no payment issues means the session is best left undisturbed.');
    }
  }

  if (normalizedPayment === 'paid' && isLowRisk && !recommendations.length) {
    addRecommendation(recommendations, ACTIONS.DO_NOTHING, 'The cart is already paid or at low risk, so no recovery action is necessary.');
  }

  if (!recommendations.length) {
    addRecommendation(recommendations, ACTIONS.DO_NOTHING, 'No strong recovery or incentive signal was detected from the inputs.');
  }

  const topAction = recommendations[0]?.action || ACTIONS.DO_NOTHING;

  return {
    actions: recommendations.map((entry) => entry.action),
    explanations: recommendations.map((entry) => ({ action: entry.action, reason: entry.reason })),
    topAction,
    riskScore: normalizedRisk,
    paymentStatus: normalizedPayment,
    cartValue: normalizedCartValue,
    deliveryEstimate: normalizedDeliveryEstimate,
    customerHistory: history,
    engagementScore: Number(engagementScore.toFixed(3)),
  };
};

module.exports = {
  ACTIONS,
  getRecommendation,
};
