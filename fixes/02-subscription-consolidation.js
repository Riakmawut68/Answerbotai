/**
 * FIX #2: CRITICAL - Subscription Model Consolidation
 * 
 * ISSUE: Both embedded user.subscription and separate Subscription model exist
 * IMPACT: Data inconsistency between subscription sources
 * 
 * This fix consolidates subscription management to use single source of truth
 */

// 1. Remove embedded subscription from User model and use separate Subscription model
const userModelSubscriptionFix = `
// In models/user.js - Remove embedded subscription object:

// REMOVE this entire section:
/*
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
*/

// ADD reference to subscription:
subscriptionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subscription',
    default: null
}
`;

// 2. Update Subscription model to be the single source of truth
const subscriptionModelFix = `
// In models/subscription.js - Enhance with additional methods:

// Add virtual for easy access
subscriptionSchema.virtual('isTrialUser').get(function() {
    return this.plan === 'none';
});

// Enhanced active check
subscriptionSchema.methods.isActive = function() {
    return this.status === 'active' && this.expiryDate > new Date();
};

// Get user's effective plan
subscriptionSchema.methods.getEffectivePlan = function() {
    if (this.isActive()) {
        return {
            type: this.plan,
            messagesPerDay: 30,
            isTrial: false
        };
    }
    
    return {
        type: 'trial',
        messagesPerDay: 3,
        isTrial: true
    };
};

// Static method to get or create subscription for user
subscriptionSchema.statics.getOrCreateForUser = async function(userId) {
    let subscription = await this.findOne({ userId });
    
    if (!subscription) {
        subscription = new this({
            userId,
            plan: 'none',
            status: 'none'
        });
        await subscription.save();
    }
    
    return subscription;
};
`;

// 3. Create subscription service to manage all subscription logic
const subscriptionServiceFix = `
// Create services/subscriptionService.js
const User = require('../models/user');
const Subscription = require('../models/subscription');
const logger = require('../utils/logger');

class SubscriptionService {
    // Get user's current subscription
    async getUserSubscription(userId) {
        try {
            const subscription = await Subscription.getOrCreateForUser(userId);
            return subscription;
        } catch (error) {
            logger.error('Error getting user subscription:', error);
            throw error;
        }
    }

    // Check if user can send message (unified logic)
    async canUserSendMessage(user) {
        try {
            const subscription = await this.getUserSubscription(user._id);
            const effectivePlan = subscription.getEffectivePlan();
            
            if (effectivePlan.isTrial) {
                return user.trialMessagesUsedToday < effectivePlan.messagesPerDay;
            } else {
                return user.dailyMessageCount < effectivePlan.messagesPerDay;
            }
        } catch (error) {
            logger.error('Error checking message permissions:', error);
            return false;
        }
    }

    // Increment message count (unified logic)
    async incrementMessageCount(user) {
        try {
            const subscription = await this.getUserSubscription(user._id);
            const effectivePlan = subscription.getEffectivePlan();
            
            if (effectivePlan.isTrial) {
                user.trialMessagesUsedToday += 1;
            } else {
                user.dailyMessageCount += 1;
            }
            
            await user.save();
            
            return {
                used: effectivePlan.isTrial ? user.trialMessagesUsedToday : user.dailyMessageCount,
                limit: effectivePlan.messagesPerDay,
                isTrial: effectivePlan.isTrial
            };
        } catch (error) {
            logger.error('Error incrementing message count:', error);
            throw error;
        }
    }

    // Activate subscription after successful payment
    async activateSubscription(user, planType, amount) {
        try {
            const subscription = await this.getUserSubscription(user._id);
            
            const duration = planType === 'weekly' ? 7 : 30;
            const expiryDate = new Date();
            expiryDate.setDate(expiryDate.getDate() + duration);
            
            subscription.plan = planType;
            subscription.amount = amount;
            subscription.startDate = new Date();
            subscription.expiryDate = expiryDate;
            subscription.status = 'active';
            subscription.autoRenew = false;
            
            await subscription.save();
            
            // Update user stage to reflect subscription status
            user.stage = 'subscription_active';
            user.subscriptionId = subscription._id;
            await user.save();
            
            logger.info(\`Subscription activated for user \${user.messengerId}: \${planType}\`);
            
            return subscription;
        } catch (error) {
            logger.error('Error activating subscription:', error);
            throw error;
        }
    }

    // Expire subscription
    async expireSubscription(userId) {
        try {
            const subscription = await this.getUserSubscription(userId);
            const user = await User.findById(userId);
            
            subscription.status = 'expired';
            await subscription.save();
            
            if (user) {
                user.stage = 'subscription_expired';
                await user.save();
            }
            
            logger.info(\`Subscription expired for user \${user?.messengerId}\`);
            
            return subscription;
        } catch (error) {
            logger.error('Error expiring subscription:', error);
            throw error;
        }
    }

    // Get subscription statistics
    async getSubscriptionStats() {
        try {
            const stats = await Subscription.aggregate([
                {
                    $group: {
                        _id: {
                            plan: '$plan',
                            status: '$status'
                        },
                        count: { $sum: 1 },
                        totalRevenue: { $sum: '$amount' }
                    }
                }
            ]);
            
            return stats;
        } catch (error) {
            logger.error('Error getting subscription stats:', error);
            throw error;
        }
    }

    // Migration helper to consolidate existing data
    async migrateEmbeddedSubscriptions() {
        try {
            logger.info('🔄 Starting subscription migration...');
            
            const users = await User.find({
                'subscription.planType': { $exists: true }
            });
            
            let migratedCount = 0;
            
            for (const user of users) {
                if (user.subscription && user.subscription.planType !== 'none') {
                    // Create separate subscription record
                    const subscription = new Subscription({
                        userId: user._id,
                        plan: user.subscription.planType,
                        amount: user.subscription.amount,
                        startDate: user.subscription.startDate,
                        expiryDate: user.subscription.expiryDate,
                        status: user.subscription.status,
                        paymentReference: user.subscription.paymentReference
                    });
                    
                    await subscription.save();
                    
                    // Update user reference
                    user.subscriptionId = subscription._id;
                    // Clear embedded subscription
                    user.subscription = undefined;
                    await user.save();
                    
                    migratedCount++;
                    logger.info(\`Migrated subscription for user \${user.messengerId}\`);
                }
            }
            
            logger.info(\`✅ Migrated \${migratedCount} subscriptions\`);
            return migratedCount;
            
        } catch (error) {
            logger.error('❌ Subscription migration failed:', error);
            throw error;
        }
    }
}

module.exports = new SubscriptionService();
`;

// 4. Update webhook controller to use consolidated subscription logic
const webhookControllerSubscriptionFix = `
// In controllers/webhookController.js - Replace subscription logic:

const subscriptionService = require('../services/subscriptionService');

// Replace the message limits section (lines 290-315) with:
async function checkAndIncrementMessageLimits(user) {
    try {
        // Check if user can send message
        const canSend = await subscriptionService.canUserSendMessage(user);
        
        if (!canSend) {
            const subscription = await subscriptionService.getUserSubscription(user._id);
            const effectivePlan = subscription.getEffectivePlan();
            
            if (effectivePlan.isTrial) {
                await messengerService.sendText(user.messengerId, 
                    '🛑 You\\'ve reached your daily free trial limit. Subscribe for premium access!'
                );
                await sendSubscriptionOptions(user.messengerId);
            } else {
                await messengerService.sendText(user.messengerId, 
                    'You\\'ve reached your daily message limit. Try again tomorrow!');
            }
            return false;
        }
        
        // Increment message count
        const usage = await subscriptionService.incrementMessageCount(user);
        
        logger.info(\`Message count updated for \${user.messengerId}: \${usage.used}/\${usage.limit} (\${usage.isTrial ? 'trial' : 'subscription'})\`);
        
        return true;
        
    } catch (error) {
        logger.error('Error checking message limits:', error);
        return false;
    }
}

// Update the processUserMessage function to use this new logic:
// Replace lines 290-317 with:
const canProceed = await checkAndIncrementMessageLimits(user);
if (!canProceed) {
    return;
}
`;

// 5. Update MoMo service to use consolidated subscription logic
const momoServiceSubscriptionFix = `
// In services/momoService.js - Update processSuccessfulPayment method:

const subscriptionService = require('./subscriptionService');

async processSuccessfulPayment(user) {
    const { planType, amount } = user.paymentSession;
    
    try {
        // Use subscription service to activate subscription
        await subscriptionService.activateSubscription(user, planType, amount);
        
        // Clear payment session
        user.paymentSession = null;
        await user.save();
        
        logger.info(\`Payment processed successfully for user \${user.messengerId}\`);
        
    } catch (error) {
        logger.error('Error processing successful payment:', error);
        throw error;
    }
}
`;

console.log("SUBSCRIPTION CONSOLIDATION FIX");
console.log("===============================");
console.log("\n1. User Model Fix:");
console.log(userModelSubscriptionFix);
console.log("\n2. Subscription Model Enhancement:");
console.log(subscriptionModelFix);
console.log("\n3. Subscription Service:");
console.log(subscriptionServiceFix);
console.log("\n4. Webhook Controller Fix:");
console.log(webhookControllerSubscriptionFix);
console.log("\n5. MoMo Service Fix:");
console.log(momoServiceSubscriptionFix);

module.exports = {
    userModelSubscriptionFix,
    subscriptionModelFix,
    subscriptionServiceFix,
    webhookControllerSubscriptionFix,
    momoServiceSubscriptionFix
};