const axios = require('axios');
const logger = require('../utils/logger');

class MomoService {
    constructor() {
        this.apiUserId = process.env.MOMO_API_USER_ID;
        this.apiKey = process.env.MOMO_API_KEY;
        this.subscriptionKey = process.env.MOMO_SUBSCRIPTION_KEY;
        this.baseUrl = process.env.MOMO_BASE_URL;
        this.callbackHost = process.env.CALLBACK_HOST;
        this.externalId = process.env.MOMO_EXTERNAL_ID;
    }

    async initiatePayment(user, planType) {
        try {
            const amount = planType === 'weekly' ? 3000 : 6500;
            const reference = `PAY-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            
            // Create payment request to MTN MoMo API
            const response = await axios.post(
                `${this.baseUrl}/collection/v1_0/requesttopay`,
                {
                    amount: amount.toString(),
                    currency: "SSP",
                    externalId: this.externalId,
                    payer: {
                        partyIdType: "MSISDN",
                        partyId: user.mobileNumber
                    },
                    payerMessage: `Answer Bot AI ${planType} subscription`,
                    payeeNote: `${planType} plan for ${user.messengerId}`
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'X-Reference-Id': reference,
                        'X-Target-Environment': process.env.MOMO_ENVIRONMENT,
                        'Ocp-Apim-Subscription-Key': this.subscriptionKey,
                        'Content-Type': 'application/json'
                    }
                }
            );

            // Update user's payment session
            user.paymentSession = {
                planType,
                amount,
                startTime: new Date(),
                status: 'pending',
                reference
            };
            await user.save();

            return {
                success: true,
                reference,
                message: 'Payment initiated successfully'
            };

        } catch (error) {
            logger.error('Error initiating payment:', error);
            throw new Error('Failed to initiate payment');
        }
    }

    async checkPaymentStatus(reference) {
        try {
            const response = await axios.get(
                `${this.baseUrl}/collection/v1_0/requesttopay/${reference}`,
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'X-Target-Environment': process.env.MOMO_ENVIRONMENT,
                        'Ocp-Apim-Subscription-Key': this.subscriptionKey
                    }
                }
            );

            return response.data.status;
        } catch (error) {
            logger.error('Error checking payment status:', error);
            throw new Error('Failed to check payment status');
        }
    }

    async verifyPayment(callbackData) {
        try {
            const { reference, status } = callbackData;
            
            if (status === 'SUCCESSFUL') {
                // Find user with this payment reference
                const User = require('../models/user');
                const user = await User.findOne({ 'paymentSession.reference': reference });
                
                if (!user) {
                    return { success: false, error: 'User not found for payment reference' };
                }

                // Calculate expiry date
                const duration = user.paymentSession.planType === 'weekly' ? 7 : 30;
                const expiryDate = new Date(Date.now() + (duration * 24 * 60 * 60 * 1000));

                return {
                    success: true,
                    reference,
                    plan: user.paymentSession.planType,
                    expiryDate,
                    user: user
                };
            } else {
                return { success: false, error: 'Payment failed' };
            }
        } catch (error) {
            logger.error('Error verifying payment:', error);
            return { success: false, error: error.message };
        }
    },

    async handlePaymentCallback(reference, status) {
        try {
            // Find user with this payment reference
            const User = require('../models/user');
            const user = await User.findOne({ 'paymentSession.reference': reference });
            if (!user) {
                throw new Error('User not found for payment reference');
            }

            if (status === 'SUCCESSFUL') {
                // Update user subscription
                const duration = user.paymentSession.planType === 'weekly' ? 7 : 30;
                user.subscription = {
                    plan: user.paymentSession.planType,
                    startDate: new Date(),
                    expiryDate: new Date(Date.now() + (duration * 24 * 60 * 60 * 1000)),
                    status: 'active',
                    paymentReference: reference
                };
                user.stage = 'subscription_active';
                user.dailyMessageCount = 0;
                user.paymentSession = null;
            } else {
                user.paymentSession.status = 'failed';
            }

            await user.save();
            return user;

        } catch (error) {
            logger.error('Error handling payment callback:', error);
            throw new Error('Failed to process payment callback');
        }
    }
}

module.exports = new MomoService();
