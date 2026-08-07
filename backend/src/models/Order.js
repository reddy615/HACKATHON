const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    sessionId: { type: String, default: null, index: true },
    cart: { type: mongoose.Schema.Types.ObjectId, ref: "Cart", required: true },
    interventionId: { type: mongoose.Schema.Types.ObjectId, ref: "Intervention", default: null, index: true },
    recoverySource: { type: String, default: null },
    items: [
      {
        product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
        quantity: { type: Number, required: true, min: 1 },
        price: { type: Number, required: true, min: 0 },
      },
    ],
    totalAmount: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ["pending", "paid", "shipped", "cancelled"],
      default: "pending",
    },
    paymentMethod: { type: String, default: "card" },
  },
  { timestamps: true }
);

orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ createdAt: -1, status: 1 });

module.exports = mongoose.model("Order", orderSchema);
