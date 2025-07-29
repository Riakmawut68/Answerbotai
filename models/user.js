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
  trialMessagesRemaining: {
    type: Number,
    default: 3
  },
  lastTrialResetDate: {
    type: Date
  },
  subscription: {
    plan: {
      type: String,
      enum: ['none', 'weekly', 'monthly'],
      default: 'none'
    },
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
  dailyMessageLimit: {
    type: Number,
    default: 30
  },
  lastMessageCountResetDate: {
    type: Date
  },
  stage: {
    type: String,
    enum: [
      'initial',
      'awaiting_phone',
      'phone_verified',
      'trial',
      'awaiting_payment',
      'subscription_active',
      'subscription_expired'
    ],
    default: 'initial'
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
    status: String
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
    this.trialMessagesRemaining = 3;
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
