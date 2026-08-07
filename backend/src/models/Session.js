const mongoose = require("mongoose");

const pageViewSchema = new mongoose.Schema(
  {
    path: { type: String, required: true, index: true },
    title: { type: String, default: "" },
    enteredAt: { type: Date, default: Date.now },
    exitedAt: { type: Date },
    durationMs: { type: Number, default: 0 },
    referrer: { type: String, default: "" },
  },
  { _id: false }
);

const eventSchema = new mongoose.Schema(
  {
    type: { type: String, required: true, index: true },
    eventName: { type: String, default: "" },
    page: { type: String, default: "" },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
    metadata: mongoose.Schema.Types.Mixed,
    createdAt: { type: Date, default: Date.now, index: true },
  },
  { _id: false }
);

const cartUpdateSchema = new mongoose.Schema(
  {
    action: { type: String, required: true, index: true },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
    quantity: { type: Number, default: 0 },
    page: { type: String, default: "" },
    createdAt: { type: Date, default: Date.now, index: true },
  },
  { _id: false }
);

const checkoutStepSchema = new mongoose.Schema(
  {
    step: { type: String, required: true, index: true },
    status: { type: String, default: "completed" },
    createdAt: { type: Date, default: Date.now, index: true },
  },
  { _id: false }
);

const paymentAttemptSchema = new mongoose.Schema(
  {
    method: { type: String, default: "unknown" },
    status: { type: String, default: "pending", index: true },
    amount: { type: Number, default: 0 },
    error: { type: String, default: "" },
    createdAt: { type: Date, default: Date.now, index: true },
  },
  { _id: false }
);

const sessionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    sessionId: { type: String, required: true, unique: true, index: true },
    deviceType: { type: String, default: "unknown", index: true },
    browser: { type: String, default: "unknown", index: true },
    os: { type: String, default: "unknown" },
    ipAddress: { type: String, default: "" },
    userAgent: { type: String, default: "" },
    location: {
      country: { type: String, default: "" },
      city: { type: String, default: "" },
      region: { type: String, default: "" },
    },
    startedAt: { type: Date, default: Date.now, index: true },
    endedAt: { type: Date },
    status: { type: String, enum: ["active", "ended"], default: "active", index: true },
    lastActivityAt: { type: Date, default: Date.now, index: true },
    totalSessionSeconds: { type: Number, default: 0 },
    pageViews: [pageViewSchema],
    clickEvents: [
      {
        element: { type: String, default: "" },
        label: { type: String, default: "" },
        page: { type: String, default: "" },
        createdAt: { type: Date, default: Date.now, index: true },
      },
      { _id: false }
    ],
    cartUpdates: [cartUpdateSchema],
    checkoutSteps: [checkoutStepSchema],
    paymentAttempts: [paymentAttemptSchema],
    events: [eventSchema],
  },
  { timestamps: true }
);

sessionSchema.index({ user: 1, lastActivityAt: -1 });
sessionSchema.index({ user: 1, startedAt: -1 });
sessionSchema.index({ user: 1, endedAt: -1 });
sessionSchema.index({ status: 1, lastActivityAt: -1 });
sessionSchema.index({ status: 1, startedAt: -1 });
sessionSchema.index({ "pageViews.path": 1, "pageViews.enteredAt": -1 });
sessionSchema.index({ "paymentAttempts.status": 1, "paymentAttempts.createdAt": -1 });

module.exports = mongoose.model("Session", sessionSchema);
