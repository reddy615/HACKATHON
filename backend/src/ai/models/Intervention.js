const mongoose = require('mongoose');

const interventionSchema = new mongoose.Schema(
  {
    sessionId: { type: String, required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    predictionId: { type: mongoose.Schema.Types.ObjectId, ref: 'PredictionHistory', index: true },
    modelVersion: { type: String, required: true, index: true },
    interventionType: {
      type: String,
      enum: ['CART_REMINDER', 'CHECKOUT_ASSISTANCE', 'PRODUCT_RECOMMENDATION', 'PERSONALIZED_MESSAGE', 'RECOVERY_OFFER', 'SUPPORT_PROMPT'],
      required: true,
      index: true,
    },
    riskLevel: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], required: true, index: true },
    abandonmentProbability: { type: Number, required: true },
    confidence: { type: Number, required: true },
    priority: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], required: true, index: true },
    thresholds: {
      minConfidence: { type: Number, required: true },
      minProbability: { type: Number, required: true },
    },
    message: { type: String, default: '' },
    status: {
      type: String,
      enum: ['TRIGGERED', 'DELIVERED', 'VIEWED', 'CLICKED', 'ACCEPTED', 'REJECTED', 'CONVERTED', 'EXPIRED', 'FAILED'],
      default: 'TRIGGERED',
      index: true,
    },
    outcome: {
      type: String,
      enum: ['RECOVERED', 'DISMISSED', 'EXPIRED', 'FAILED', null],
      default: null,
      index: true,
    },
    payload: { type: mongoose.Schema.Types.Mixed, default: {} },
    deliveryChannel: { type: String, default: 'internal' },
    externalDeliverySupported: { type: Boolean, default: false },
    triggeredAt: { type: Date, default: Date.now, index: true },
    shownAt: { type: Date },
    interactedAt: { type: Date },
    acceptedAt: { type: Date },
    rejectedAt: { type: Date },
    expiredAt: { type: Date },
    convertedAt: { type: Date },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
    conversionValue: { type: Number, default: 0 },
    attributionSource: { type: String, default: '' },
    cooldownExpiresAt: { type: Date },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    recoveryMetadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

interventionSchema.index({ userId: 1, sessionId: 1, status: 1, createdAt: -1 });
interventionSchema.index({ sessionId: 1, interventionType: 1, status: 1 });
interventionSchema.index({ status: 1, interventionType: 1, riskLevel: 1 });
interventionSchema.index({ orderId: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Intervention', interventionSchema, 'interventions');
