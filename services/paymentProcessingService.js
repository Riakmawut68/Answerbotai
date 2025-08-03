const User = require('../models/user');
const MomoService = require('./momoService');
const messengerService = require('./messengerService');
const config = require('../config');
const logger = require('../utils/logger');

class PaymentProcessingService {
    constructor() {
        this.momoService = new MomoService();
    }

    /**
     * Initiate a subscription payment for a user
     * @param {Object} user - User object
     * @param {string} planType - 'weekly' or 'monthly'
     * @returns {Object} Payment result
     */
    async initiateSubscription(user, planType) {
        try {
            logger.info(`Initiating ${planType} subscription for user ${user.messengerId}`);

            // Validate plan type
            if (!config.limits.subscriptionPlans[planType]) {
                throw new Error(`Invalid plan type: ${planType}`);
            }

            // Validate user has payment mobile number
            if (!user.paymentMobileNumber) {
                throw new Error('User does not have a payment mobile number');
            }

            // Initiate payment through MoMo service
            const paymentResult = await this.momoService.initiatePayment(user, planType);
            
            if (paymentResult.success) {
                logger.info(`Payment initiated successfully for user ${user.messengerId}`, {
                    planType,
                    amount: paymentResult.amount,
                    reference: paymentResult.reference
                });

                // Send payment processing message
                await messengerService.sendText(user.messengerId,
                    '⏳ Your payment is being processed.\n\n' +
                    'Please check your phone for a payment prompt. Complete the transaction within 15 minutes.\n\n' +
                    'Type "cancel" to cancel this payment.'
                );

                return {
                    success: true,
                    reference: paymentResult.reference,
                    amount: paymentResult.amount,
                    planType
                };
            } else {
                throw new Error('Payment initiation failed');
            }

        } catch (error) {
            logger.error(`Payment initiation failed for user ${user.messengerId}`, {
                planType,
                error: error.message
            });

            // Send error message to user
            await messengerService.sendText(user.messengerId,
                'Sorry, there was an error processing your payment request. Please try again in a moment.'
            );

            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Handle payment callback from MTN MoMo
     * @param {Object} callbackData - Callback data from MoMo
     * @returns {Object} Processing result
     */
    async handleCallback(callbackData) {
        try {
            logger.info('Processing payment callback', { callbackData });

            // Validate callback data
            if (!callbackData.referenceId || !callbackData.status) {
                throw new Error('Invalid callback data: missing referenceId or status');
            }

            // Find user by payment reference
            const user = await User.findOne({
                'paymentSession.reference': callbackData.referenceId
            });

            if (!user) {
                logger.error('User not found for payment callback', { 
                    reference: callbackData.referenceId 
                });
                throw new Error('User not found for payment reference');
            }

            // Process the callback through MoMo service
            const result = await this.momoService.handlePaymentCallback(callbackData);
            
            if (result.success) {
                // Send appropriate notification to user
                if (callbackData.status === 'SUCCESSFUL') {
                    await messengerService.sendText(user.messengerId,
                        '🎉 Payment successful! Your subscription is now active.\n\n' +
                        'You can now send up to 30 messages per day. Enjoy using Answer Bot AI!'
                    );
                    logger.info(`✅ Payment completed for user ${user.messengerId}`);
                } else if (callbackData.status === 'FAILED') {
                    await messengerService.sendText(user.messengerId,
                        '❌ Payment failed. You can continue using your trial messages or try subscribing again later.'
                    );
                    logger.info(`❌ Payment failed for user ${user.messengerId}`);
                }
            }

            return result;

        } catch (error) {
            logger.error('Payment callback processing failed', {
                error: error.message,
                callbackData
            });
            throw error;
        }
    }

    /**
     * Get payment status for a user
     * @param {string} reference - Payment reference
     * @returns {Object} Payment status
     */
    async getPaymentStatus(reference) {
        try {
            return await this.momoService.checkPaymentStatus(reference);
        } catch (error) {
            logger.error('Failed to get payment status', { reference, error: error.message });
            throw error;
        }
    }

    /**
     * Verify payment for a user
     * @param {string} reference - Payment reference
     * @returns {Object} Verification result
     */
    async verifyPayment(reference) {
        try {
            return await this.momoService.verifyPayment(reference);
        } catch (error) {
            logger.error('Failed to verify payment', { reference, error: error.message });
            throw error;
        }
    }

    /**
     * Calculate plan amount
     * @param {string} planType - 'weekly' or 'monthly'
     * @returns {number} Plan amount
     */
    calculatePlanAmount(planType) {
        return this.momoService.calculatePlanAmount(planType);
    }

    /**
     * Get subscription plans
     * @returns {Object} Available subscription plans
     */
    getSubscriptionPlans() {
        return config.limits.subscriptionPlans;
    }

    /**
     * Test MoMo service connection
     * @returns {Object} Test result
     */
    async testConnection() {
        try {
            return await this.momoService.testConnection();
        } catch (error) {
            logger.error('MoMo connection test failed', { error: error.message });
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get service diagnostics
     * @returns {Object} Diagnostic information
     */
    async getDiagnostics() {
        try {
            return await this.momoService.diagnose();
        } catch (error) {
            logger.error('MoMo diagnostics failed', { error: error.message });
            return {
                overallStatus: 'diagnostic_failed',
                error: error.message
            };
        }
    }
}

module.exports = new PaymentProcessingService(); 