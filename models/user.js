const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  messengerId: {
    type: String,
    required: true,
    unique: true
  },
  mobileNumber: {
    type: String,
    validate: {
      validator: function(v) {
        // Only validate if a value is provided (allow null/undefined for clearing)
        if (!v) return true;
        return /^092\d{7}$/.test(v);
      },
      message: props => `${props.value} is not a valid MTN South Sudan number!`
    }
  },
  paymentMobileNumber: {
    type: String,
    validate: {
      validator: function(v) {
        // Only validate if a value is provided (allow null/undefined for clearing)
        if (!v) return true;
        return /^092\d{7}$/.test(v);
      },
      message: props => `${props.value} is not a valid MTN South Sudan number!`
    }
  },
  consentTimestamp: {
    type: Date
  },
  trialMessagesUsedToday: {
    type: Number,
    default: 0
  },
  lastTrialResetDate: {
    type: Date
  },
  subscription: {
    planType: {
      type: String,
      enum: ['none', 'weekly', 'monthly'],
      default: 'none'
    },
    amount: Number,
    startDate: Date,
    expiryDate: Date,
    status: {
      type: String,
      enum: ['none', 'pending', 'active', 'expired'],
      default: 'none'
    },
    paymentReference: String
  },
  dailyMessageCount: {
    type: Number,
    default: 0
  },
  lastMessageCountResetDate: {
    type: Date
  },
  stage: {
    type: String,
    enum: [
      'initial',
      'awaiting_phone',
      'awaiting_phone_for_payment',
      'trial',
      'awaiting_payment',
      'subscribed',
      'payment_failed',
      'subscription_expired'
    ],
    default: 'initial'
  },
  lastSelectedPlanType: {
    type: String,
    enum: ['weekly', 'monthly'],
    default: 'weekly'
  },
  hasUsedTrial: {
    type: Boolean,
    default: false
  },
  trialStartDate: {
    type: Date
  },
  paymentSession: {
    planType: String,
    amount: Number,
    startTime: Date,
    status: String,
    reference: String,
    externalId: String,
    processedAt: Date
  },
  markedForDeletion: {
    type: Boolean,
    default: false
  },
  deletionRequestedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Reset trial messages daily
userSchema.methods.resetDailyTrialCount = async function() {
  const today = new Date();
  if (!this.lastTrialResetDate || 
      this.lastTrialResetDate.toDateString() !== today.toDateString()) {
    this.trialMessagesUsedToday = 0;
    this.lastTrialResetDate = today;
    await this.save();
  }
};

// Reset daily message count
userSchema.methods.resetDailyMessageCount = async function() {
  const today = new Date();
  if (!this.lastMessageCountResetDate || 
      this.lastMessageCountResetDate.toDateString() !== today.toDateString()) {
    this.dailyMessageCount = 0;
    this.lastMessageCountResetDate = today;
    await this.save();
  }
};

module.exports = mongoose.model('User', userSchema);
