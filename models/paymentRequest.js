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

// Optional TTL retention: set PAYMENT_REQUEST_TTL_DAYS to auto-expire old records
// Mongo requires this to be a Date field index; we use createdAt
const ttlDays = parseInt(process.env.PAYMENT_REQUEST_TTL_DAYS, 10);
if (!isNaN(ttlDays) && ttlDays > 0) {
  const seconds = ttlDays * 24 * 60 * 60;
  paymentRequestSchema.index({ createdAt: 1 }, { expireAfterSeconds: seconds });
}

module.exports = mongoose.model('PaymentRequest', paymentRequestSchema);


