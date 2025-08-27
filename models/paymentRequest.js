const mongoose = require('mongoose');

const paymentRequestSchema = new mongoose.Schema({
  referenceId: { type: String, index: true, required: true, unique: true },
  externalId: { type: String, index: true, required: true },
  messengerId: { type: String, index: true, required: true },
  planType: { type: String, enum: ['weekly', 'monthly'], required: true },
  amount: { type: Number, required: true },
  status: { type: String, enum: ['pending', 'SUCCESSFUL', 'FAILED', 'unknown'], default: 'pending', index: true },
  reason: { type: String },
  rawCallback: { type: Object },
}, { timestamps: true });

paymentRequestSchema.index({ externalId: 1 });

module.exports = mongoose.model('PaymentRequest', paymentRequestSchema);


