const mongoose = require('mongoose');

const interventionSchema = new mongoose.Schema(
  {
    sessionId: { type: String, required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    predictionId: { type: mongoose.Schema.Types.ObjectId, ref: 'PredictionHistory', index: true },
    modelVersion: { type: String, required: true, index: true },
    interventionType: {
      type: String,
      enum: ['NONE', 'CART_REMINDER', 'CHECKOUT_ASSISTANCE', 'PRODUCT_RECOMMENDATION', 'PERSONALIZED_MESSAGE', 'RECOVERY_OFFER', 'SUPPORT_PROMPT'],
      required: true,
      index: true,
    },
    riskLevel: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], required: true, index: true },
    abandonmentProbability: { type: Number, required: true },
    confidence: { type: Number, required: true },
    priority: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], required: true, index: true },
    reason: { type: String, default: '' },
    status: {
      type: String,
      enum: ['PENDING', 'TRIGGERED', 'DELIVERED', 'VIEWED', 'CLICKED', 'CONVERTED', 'DISMISSED', 'FAILED', 'EXPIRED'],
      default: 'PENDING',
      index: true,
    },
    payload: { type: mongoose.Schema.Types.Mixed, default: {} },
    deliveredAt: { type: Date },
    interactedAt: { type: Date },
    convertedAt: { type: Date },
    expiredAt: { type: Date },
    outcome: { type: String, enum: ['RECOVERED', 'NOT_RECOVERED', 'DISMISSED', 'EXPIRED', 'FAILED', 'NONE'], default: 'NONE' },
    cartId: { type: mongoose.Schema.Types.ObjectId, ref: 'Cart' },
    recoveryMetadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

interventionSchema.index({ userId: 1, sessionId: 1, status: 1, createdAt: -1 });
interventionSchema.index({ status: 1, interventionType: 1, riskLevel: 1 });

module.exports = mongoose.model('Intervention', interventionSchema, 'interventions');
