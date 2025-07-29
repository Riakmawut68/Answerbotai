/**
 * FIX #1: CRITICAL - Stage Definition Standardization
 * 
 * ISSUE: User model defines different stages than webhook controller logic uses
 * IMPACT: Database validation errors and broken user flows
 * 
 * This fix standardizes stage definitions across the entire application
 */

// 1. Update User Model with correct stage definitions
const userModelFix = `
// In models/user.js - Replace the stage enum with:
stage: {
    type: String,
    enum: [
        'initial',
        'awaiting_phone',
        'awaiting_phone_for_payment', 
        'trial',
        'awaiting_payment',
        'subscription_active',  // Add this
        'payment_failed',
        'subscription_expired'
    ],
    default: 'initial'
}
`;

// 2. Update webhook controller to use correct stages
const webhookControllerFix = `
// In controllers/webhookController.js - Update stage usage:

// Line 276: Change 'subscription_active' to 'subscription_active' (ensure consistency)
case 'subscription_active':
    // Check subscription limits
    if (user.dailyMessageCount >= config.limits.subscriptionMessagesPerDay) {
        await messengerService.sendText(user.messengerId, 'You\\'ve reached your daily message limit. Try again tomorrow!');
        return;
    }
    break;

// Line 182: Update MoMo service to set correct stage
// In services/momoService.js - processSuccessfulPayment method:
user.stage = 'subscription_active'; // Instead of 'subscribed'
`;

// 3. Add stage validation utility
const stageValidationUtil = `
// Create utils/stageValidator.js
class StageValidator {
    static VALID_STAGES = [
        'initial',
        'awaiting_phone',
        'awaiting_phone_for_payment',
        'trial',
        'awaiting_payment',
        'subscription_active',
        'payment_failed',
        'subscription_expired'
    ];

    static STAGE_TRANSITIONS = {
        'initial': ['awaiting_phone'],
        'awaiting_phone': ['trial', 'awaiting_phone_for_payment'],
        'awaiting_phone_for_payment': ['awaiting_payment'],
        'trial': ['awaiting_payment', 'subscription_active'],
        'awaiting_payment': ['subscription_active', 'payment_failed', 'trial'],
        'subscription_active': ['subscription_expired'],
        'payment_failed': ['trial', 'awaiting_payment'],
        'subscription_expired': ['awaiting_payment', 'trial']
    };

    static isValidStage(stage) {
        return this.VALID_STAGES.includes(stage);
    }

    static canTransition(fromStage, toStage) {
        const allowedTransitions = this.STAGE_TRANSITIONS[fromStage] || [];
        return allowedTransitions.includes(toStage);
    }

    static validateTransition(user, newStage) {
        if (!this.isValidStage(newStage)) {
            throw new Error(\`Invalid stage: \${newStage}\`);
        }

        if (!this.canTransition(user.stage, newStage)) {
            throw new Error(\`Invalid transition from \${user.stage} to \${newStage}\`);
        }

        return true;
    }

    static sanitizeStage(stage) {
        // Fix common stage inconsistencies
        const stageMappings = {
            'subscribed': 'subscription_active',
            'phone_verified': 'trial',
            'active': 'subscription_active'
        };

        return stageMappings[stage] || stage;
    }
}

module.exports = StageValidator;
`;

// 4. Database migration script to fix existing invalid stages
const migrationScript = `
// Create migrations/fix-invalid-stages.js
const mongoose = require('mongoose');
const User = require('../models/user');
const StageValidator = require('../utils/stageValidator');

async function fixInvalidStages() {
    console.log('🔧 Starting stage validation fix...');
    
    try {
        // Find users with invalid stages
        const users = await User.find({});
        let fixedCount = 0;
        
        for (const user of users) {
            const originalStage = user.stage;
            const sanitizedStage = StageValidator.sanitizeStage(originalStage);
            
            if (originalStage !== sanitizedStage) {
                console.log(\`Fixing user \${user.messengerId}: \${originalStage} → \${sanitizedStage}\`);
                user.stage = sanitizedStage;
                await user.save();
                fixedCount++;
            } else if (!StageValidator.isValidStage(originalStage)) {
                // Default to appropriate stage based on user state
                let newStage = 'initial';
                
                if (user.consentTimestamp && user.mobileNumber && user.hasUsedTrial) {
                    newStage = 'trial';
                } else if (user.consentTimestamp && !user.mobileNumber) {
                    newStage = 'awaiting_phone';
                } else if (user.subscription && user.subscription.status === 'active') {
                    newStage = 'subscription_active';
                }
                
                console.log(\`Defaulting user \${user.messengerId}: \${originalStage} → \${newStage}\`);
                user.stage = newStage;
                await user.save();
                fixedCount++;
            }
        }
        
        console.log(\`✅ Fixed \${fixedCount} users with invalid stages\`);
        
    } catch (error) {
        console.error('❌ Error fixing stages:', error);
        throw error;
    }
}

// Run if called directly
if (require.main === module) {
    mongoose.connect(process.env.MONGODB_URI)
        .then(() => fixInvalidStages())
        .then(() => process.exit(0))
        .catch(error => {
            console.error(error);
            process.exit(1);
        });
}

module.exports = { fixInvalidStages };
`;

console.log("STAGE STANDARDIZATION FIX");
console.log("=========================");
console.log("\n1. User Model Fix:");
console.log(userModelFix);
console.log("\n2. Webhook Controller Fix:");
console.log(webhookControllerFix);
console.log("\n3. Stage Validation Utility:");
console.log(stageValidationUtil);
console.log("\n4. Migration Script:");
console.log(migrationScript);

module.exports = {
    userModelFix,
    webhookControllerFix,
    stageValidationUtil,
    migrationScript
};