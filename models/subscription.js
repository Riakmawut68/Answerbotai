const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    plan: {
        type: String,
        enum: ['none', 'weekly', 'monthly'],
        default: 'none'
    },
    startDate: {
        type: Date
    },
    expiryDate: {
        type: Date
    },
    status: {
        type: String,
        enum: ['none', 'pending', 'active', 'expired', 'cancelled'],
        default: 'none'
    },
    paymentReference: {
        type: String
    },
    amount: {
        type: Number
    },
    currency: {
        type: String,
        default: 'SSP'
    },
    autoRenew: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

// Index for performance
subscriptionSchema.index({ userId: 1 });
subscriptionSchema.index({ status: 1 });
subscriptionSchema.index({ expiryDate: 1 });

// Check if subscription is active
subscriptionSchema.methods.isActive = function() {
    return this.status === 'active' && this.expiryDate > new Date();
};

// Check if subscription is expired
subscriptionSchema.methods.isExpired = function() {
    return this.expiryDate <= new Date();
};

// Get remaining days
subscriptionSchema.methods.getRemainingDays = function() {
    if (!this.expiryDate) return 0;
    const now = new Date();
    const diffTime = this.expiryDate - now;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

module.exports = mongoose.model('Subscription', subscriptionSchema); 