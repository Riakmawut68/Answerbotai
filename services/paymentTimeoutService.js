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
            
            logger.info(`Payment timeout started for user ${user.messengerId}: ${this.PAYMENT_TIMEOUT_MINUTES} minutes`);
            
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
            logger.info(`Payment timeout cleared for user ${messengerId}`);
        }
    }

    // Handle payment timeout
    async handlePaymentTimeout(messengerId) {
        try {
            const user = await User.findOne({ messengerId });
            if (!user) {
                logger.warn(`User not found for payment timeout: ${messengerId}`);
                return;
            }

            // Check if user is still in awaiting_payment state
            if (user.stage !== 'awaiting_payment') {
                logger.info(`User ${messengerId} no longer in payment state, timeout cancelled`);
                this.clearPaymentTimeout(messengerId);
                return;
            }

            logger.warn(`Payment timeout for user ${messengerId}, resetting to trial`);

            // Reset user to trial state
            user.stage = 'trial';
            user.paymentSession = null;
            await user.save();

            // Send timeout message to user
            await messengerService.sendText(user.messengerId,
                '⏰ Your payment session has timed out after 15 minutes.\n\n' +
                'You can continue using your trial messages or try subscribing again when ready.\n\n' +
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
            logger.error(`Error handling payment timeout for ${messengerId}:`, error);
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

            logger.info(`Found ${stuckUsers.length} users with stuck payments`);

            for (const user of stuckUsers) {
                logger.warn(`Recovering stuck payment for user ${user.messengerId}`);
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
}

module.exports = new PaymentTimeoutService();