/**
 * FIX #3: CRITICAL - Payment Timeout Handling
 * 
 * ISSUE: Users can get stuck in 'awaiting_payment' stage indefinitely
 * IMPACT: Poor user experience and potential lost revenue
 * 
 * This fix adds timeout mechanisms and recovery flows for payment processing
 */

// 1. Add payment timeout service
const paymentTimeoutServiceFix = `
// Create services/paymentTimeoutService.js
const User = require('../models/user');
const logger = require('../utils/logger');
const messengerService = require('./messengerService');

class PaymentTimeoutService {
    constructor() {
        this.PAYMENT_TIMEOUT_MINUTES = 15; // 15 minutes timeout
        this.timeouts = new Map(); // Store active timeouts
    }

    // Start payment timeout for user
    startPaymentTimeout(user) {
        try {
            // Clear any existing timeout
            this.clearPaymentTimeout(user.messengerId);
            
            const timeoutMs = this.PAYMENT_TIMEOUT_MINUTES * 60 * 1000;
            
            const timeoutId = setTimeout(async () => {
                await this.handlePaymentTimeout(user.messengerId);
            }, timeoutMs);
            
            this.timeouts.set(user.messengerId, {
                timeoutId,
                startTime: new Date(),
                planType: user.paymentSession?.planType,
                amount: user.paymentSession?.amount
            });
            
            logger.info(\`Payment timeout started for user \${user.messengerId}: \${this.PAYMENT_TIMEOUT_MINUTES} minutes\`);
            
        } catch (error) {
            logger.error('Error starting payment timeout:', error);
        }
    }

    // Clear payment timeout for user
    clearPaymentTimeout(messengerId) {
        const timeout = this.timeouts.get(messengerId);
        if (timeout) {
            clearTimeout(timeout.timeoutId);
            this.timeouts.delete(messengerId);
            logger.info(\`Payment timeout cleared for user \${messengerId}\`);
        }
    }

    // Handle payment timeout
    async handlePaymentTimeout(messengerId) {
        try {
            const user = await User.findOne({ messengerId });
            if (!user) {
                logger.warn(\`User not found for payment timeout: \${messengerId}\`);
                return;
            }

            // Check if user is still in awaiting_payment state
            if (user.stage !== 'awaiting_payment') {
                logger.info(\`User \${messengerId} no longer in payment state, timeout cancelled\`);
                this.clearPaymentTimeout(messengerId);
                return;
            }

            logger.warn(\`Payment timeout for user \${messengerId}, resetting to trial\`);

            // Reset user to trial state
            user.stage = 'trial';
            user.paymentSession = null;
            await user.save();

            // Send timeout message to user
            await messengerService.sendText(user.messengerId,
                '⏰ Your payment session has timed out after 15 minutes.\\n\\n' +
                'You can continue using your trial messages or try subscribing again when ready.\\n\\n' +
                'Type "help" for assistance or select a plan below:'
            );

            // Offer subscription options again
            const buttons = [
                {
                    type: 'postback',
                    title: 'Weekly Plan 3,000 SSP',
                    payload: 'SUBSCRIBE_WEEKLY'
                },
                {
                    type: 'postback',
                    title: 'Monthly Plan 6,500 SSP',
                    payload: 'SUBSCRIBE_MONTHLY'
                }
            ];

            await messengerService.sendButtonTemplate(user.messengerId,
                'Choose a subscription plan:', 
                buttons
            );

            // Clear timeout
            this.clearPaymentTimeout(messengerId);

        } catch (error) {
            logger.error(\`Error handling payment timeout for \${messengerId}:\`, error);
        }
    }

    // Check for stuck payments (for scheduled cleanup)
    async checkStuckPayments() {
        try {
            const cutoffTime = new Date();
            cutoffTime.setMinutes(cutoffTime.getMinutes() - (this.PAYMENT_TIMEOUT_MINUTES + 5));

            const stuckUsers = await User.find({
                stage: 'awaiting_payment',
                'paymentSession.startTime': { $lt: cutoffTime }
            });

            logger.info(\`Found \${stuckUsers.length} users with stuck payments\`);

            for (const user of stuckUsers) {
                logger.warn(\`Recovering stuck payment for user \${user.messengerId}\`);
                await this.handlePaymentTimeout(user.messengerId);
            }

            return stuckUsers.length;

        } catch (error) {
            logger.error('Error checking stuck payments:', error);
            throw error;
        }
    }

    // Get timeout status for user
    getTimeoutStatus(messengerId) {
        const timeout = this.timeouts.get(messengerId);
        if (!timeout) {
            return null;
        }

        const elapsed = Date.now() - timeout.startTime.getTime();
        const remaining = (this.PAYMENT_TIMEOUT_MINUTES * 60 * 1000) - elapsed;

        return {
            startTime: timeout.startTime,
            elapsedMs: elapsed,
            remainingMs: Math.max(0, remaining),
            remainingMinutes: Math.max(0, Math.ceil(remaining / (60 * 1000))),
            planType: timeout.planType,
            amount: timeout.amount
        };
    }

    // Get all active timeouts (for monitoring)
    getAllActiveTimeouts() {
        const activeTimeouts = [];
        for (const [messengerId, timeout] of this.timeouts.entries()) {
            const status = this.getTimeoutStatus(messengerId);
            if (status) {
                activeTimeouts.push({
                    messengerId,
                    ...status
                });
            }
        }
        return activeTimeouts;
    }
}

module.exports = new PaymentTimeoutService();
`;

// 2. Update MoMo service to use payment timeout
const momoServiceTimeoutFix = `
// In services/momoService.js - Update payment initiation:

const paymentTimeoutService = require('./paymentTimeoutService');

async handleSuccess(user, planType, amount, reference) {
    user.paymentSession = {
        planType,
        amount,
        startTime: new Date(),
        status: 'pending',
        reference
    };
    await user.save();

    // Start payment timeout
    paymentTimeoutService.startPaymentTimeout(user);

    logger.info(\`Payment initiated successfully for \${user.messengerId}, Ref: \${reference}\`);
    return { success: true, reference };
}

// Update callback handling to clear timeout
async handlePaymentCallback(callbackData) {
    try {
        logger.info('Processing payment callback', {
            reference: callbackData.reference,
            status: callbackData.status,
            environment: this.environment
        });

        // Find user by payment reference
        const user = await User.findOne({
            'paymentSession.reference': callbackData.reference
        });

        if (!user) {
            logger.error('User not found for payment callback', { reference: callbackData.reference });
            throw new Error('User not found for payment reference');
        }

        // Clear payment timeout since we received callback
        paymentTimeoutService.clearPaymentTimeout(user.messengerId);

        // ... rest of existing callback logic ...

        return { success: true };
    } catch (error) {
        logger.error('Payment callback processing failed', {
            error: error.message,
            callbackData
        });
        throw error;
    }
}
`;

// 3. Update webhook controller to handle payment recovery commands
const webhookControllerTimeoutFix = `
// In controllers/webhookController.js - Add payment recovery logic:

const paymentTimeoutService = require('../services/paymentTimeoutService');

// Add to processUserMessage function for awaiting_payment stage:
case 'awaiting_payment':
    const messageText = messageText.toLowerCase().trim();
    
    if (messageText === 'cancel' || messageText === 'stop') {
        // User wants to cancel payment
        paymentTimeoutService.clearPaymentTimeout(user.messengerId);
        user.stage = 'trial';
        user.paymentSession = null;
        await user.save();
        
        await messengerService.sendText(user.messengerId,
            '✅ Payment cancelled. You can continue using your trial messages or try subscribing again later.'
        );
        return;
    }
    
    if (messageText === 'status' || messageText === 'check') {
        // Show payment status
        const timeoutStatus = paymentTimeoutService.getTimeoutStatus(user.messengerId);
        if (timeoutStatus) {
            await messengerService.sendText(user.messengerId,
                \`⏱️ Payment Status:\\n\\n\` +
                \`Plan: \${timeoutStatus.planType} (\${timeoutStatus.amount} SSP)\\n\` +
                \`Time remaining: \${timeoutStatus.remainingMinutes} minutes\\n\\n\` +
                \`Please complete the payment on your phone or type "cancel" to cancel.\`
            );
        }
        return;
    }
    
    // Default message for users in payment state
    await messengerService.sendText(user.messengerId, 
        'Please complete your payment to continue.\\n\\n' +
        'Commands:\\n' +
        '• Type "status" to check payment status\\n' +
        '• Type "cancel" to cancel payment'
    );
    return;
`;

// 4. Add payment recovery scheduler
const paymentRecoverySchedulerFix = `
// Create schedulers/paymentRecovery.js
const cron = require('cron');
const logger = require('../utils/logger');
const paymentTimeoutService = require('../services/paymentTimeoutService');

class PaymentRecoveryScheduler {
    constructor() {
        this.job = null;
        this.isRunning = false;
    }

    // Start the payment recovery scheduler
    start() {
        // Run every 5 minutes to check for stuck payments
        const cronExpression = '*/5 * * * *';
        
        this.job = new cron.CronJob(
            cronExpression,
            () => this.recoverStuckPayments(),
            null,
            false,
            'UTC'
        );

        this.job.start();
        logger.info(\`💳 Payment recovery scheduler started. Will run every 5 minutes (\${cronExpression})\`);
    }

    // Stop the scheduler
    stop() {
        if (this.job) {
            this.job.stop();
            logger.info('🛑 Payment recovery scheduler stopped');
        }
    }

    // Recover stuck payments
    async recoverStuckPayments() {
        if (this.isRunning) {
            logger.warn('⚠️ Payment recovery already running, skipping...');
            return;
        }

        this.isRunning = true;
        const startTime = Date.now();

        try {
            logger.info('🔄 Starting payment recovery check...');

            const recoveredCount = await paymentTimeoutService.checkStuckPayments();
            const duration = Date.now() - startTime;

            logger.info('✅ Payment recovery completed:', {
                recoveredPayments: recoveredCount,
                duration: \`\${duration}ms\`,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            logger.error('❌ Payment recovery failed:', {
                error: error.message,
                stack: error.stack,
                duration: \`\${Date.now() - startTime}ms\`
            });
        } finally {
            this.isRunning = false;
        }
    }

    // Manual recovery for testing
    async manualRecovery() {
        logger.info('🔧 Manual payment recovery triggered');
        await this.recoverStuckPayments();
    }

    // Get scheduler status
    getStatus() {
        return {
            isRunning: this.isRunning,
            isActive: this.job ? this.job.running : false,
            nextRun: this.job ? this.job.nextDate().toISOString() : null,
            cronExpression: '*/5 * * * *'
        };
    }
}

module.exports = new PaymentRecoveryScheduler();
`;

// 5. Update server.js to include payment recovery scheduler
const serverTimeoutFix = `
// In server.js - Add payment recovery scheduler:

const paymentRecoveryScheduler = require('./schedulers/paymentRecovery');

// Add after other schedulers:
logger.info('🕐 Starting scheduled tasks...');
dailyResetScheduler.start();
subscriptionCheckerScheduler.start();
paymentRecoveryScheduler.start(); // Add this line
logger.info('✅ Scheduled tasks started successfully');

// Add to graceful shutdown:
process.on('SIGTERM', () => {
    logger.info('🛑 SIGTERM received, shutting down gracefully...');
    dailyResetScheduler.stop();
    subscriptionCheckerScheduler.stop();
    paymentRecoveryScheduler.stop(); // Add this line
    mongoose.connection.close(() => {
        logger.info('✅ MongoDB connection closed');
        process.exit(0);
    });
});
`;

console.log("PAYMENT TIMEOUT HANDLING FIX");
console.log("=============================");
console.log("\n1. Payment Timeout Service:");
console.log(paymentTimeoutServiceFix);
console.log("\n2. MoMo Service Timeout Fix:");
console.log(momoServiceTimeoutFix);
console.log("\n3. Webhook Controller Timeout Fix:");
console.log(webhookControllerTimeoutFix);
console.log("\n4. Payment Recovery Scheduler:");
console.log(paymentRecoverySchedulerFix);
console.log("\n5. Server Configuration Fix:");
console.log(serverTimeoutFix);

module.exports = {
    paymentTimeoutServiceFix,
    momoServiceTimeoutFix,
    webhookControllerTimeoutFix,
    paymentRecoverySchedulerFix,
    serverTimeoutFix
};