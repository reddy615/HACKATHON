const test = require('node:test');
const assert = require('node:assert/strict');
const { getRecommendation, ACTIONS } = require('../src/ai/services/recommendationService');

test('Recommendation engine returns Do Nothing for low-risk paid cart', () => {
  const result = getRecommendation({
    riskScore: 0.1,
    paymentStatus: 'paid',
    cartValue: 20,
    deliveryEstimate: 2,
    customerHistory: { totalOrders: 1, abandonments: 0 },
    sessionActivity: { pageViews: 2, cartUpdates: 1, checkoutSteps: 0, paymentAttempts: 1, timeOnSiteSeconds: 90 },
  });

  assert.equal(result.topAction, ACTIONS.DO_NOTHING);
  assert.equal(result.actions.includes(ACTIONS.DO_NOTHING), true);
  assert.equal(result.explanations[0].reason.includes('already paid') || result.explanations[0].reason.includes('No strong recovery'), true);
});

test('Recommendation engine suggests Retry Payment for failed payment on high-risk cart', () => {
  const result = getRecommendation({
    riskScore: 0.8,
    paymentStatus: 'failed',
    cartValue: 120,
    deliveryEstimate: 3,
    customerHistory: { totalOrders: 2, abandonments: 1 },
    sessionActivity: { pageViews: 8, cartUpdates: 3, checkoutSteps: 2, paymentAttempts: 1, timeOnSiteSeconds: 240 },
  });

  assert.equal(result.topAction, ACTIONS.RETRY_PAYMENT);
  assert.equal(result.actions.includes(ACTIONS.EMAIL_REMINDER), true);
  assert.equal(result.actions.includes(ACTIONS.WHATSAPP_REMINDER), true);
});

test('Recommendation engine suggests Do Nothing if inputs are invalid', () => {
  const result = getRecommendation({
    riskScore: null,
    paymentStatus: null,
    cartValue: null,
    deliveryEstimate: null,
    customerHistory: {},
    sessionActivity: {},
  });

  assert.equal(result.topAction, ACTIONS.DO_NOTHING);
  assert.equal(result.actions.length, 1);
});
