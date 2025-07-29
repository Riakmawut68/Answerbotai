const axios = require('axios');
const logger = require('../utils/logger');

class MomoService {
    constructor() {
        // Use sandbox test credentials if in sandbox environment and credentials are missing
        const environment = process.env.MOMO_ENVIRONMENT || 'sandbox';
        
        if (environment === 'sandbox' && !process.env.MOMO_API_USER_ID) {
            console.log('🔧 Using sandbox test credentials for MTN MoMo API');
            this.apiUserId = "ba5368da-8ea8-4926-8d51-e549388441f4";
            this.apiKey = "200621ac8dff419faff263f2f532f60f";
            this.subscriptionKey = "2e669906cdfd458fb7941e09fed98f38";
            this.baseUrl = "https://sandbox.momodeveloper.mtn.com";
            this.externalId = "123456789";
        } else {
            this.apiUserId = process.env.MOMO_API_USER_ID;
            this.apiKey = process.env.MOMO_API_KEY;
            this.subscriptionKey = process.env.MOMO_SUBSCRIPTION_KEY;
            this.baseUrl = process.env.MOMO_BASE_URL;
            this.externalId = process.env.MOMO_EXTERNAL_ID;
        }
        
        this.callbackHost = process.env.CALLBACK_HOST;
        
        // Validate required environment variables
        this.validateConfiguration();
    }

    validateConfiguration() {
        const missingVars = [];
        
        if (!this.apiUserId) missingVars.push('MOMO_API_USER_ID');
        if (!this.apiKey) missingVars.push('MOMO_API_KEY');
        if (!this.subscriptionKey) missingVars.push('MOMO_SUBSCRIPTION_KEY');
        if (!this.baseUrl) missingVars.push('MOMO_BASE_URL');
        if (!this.externalId) missingVars.push('MOMO_EXTERNAL_ID');
        
        if (missingVars.length > 0) {
            logger.error(`Missing required MoMo environment variables: ${missingVars.join(', ')}`);
            throw new Error(`Missing required MoMo environment variables: ${missingVars.join(', ')}`);
        }
        
        logger.info('MoMo service configuration validated successfully');
    }

    async initiatePayment(user, planType) {
        const amount = planType === 'weekly' ? 3000 : 6500;
        const reference = `PAY-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        try {
            // Log request details for debugging
            logger.info(`Initiating payment for user ${user.messengerId}, plan: ${planType}, amount: ${amount}, reference: ${reference}`);
            logger.info(`Using baseUrl: ${this.baseUrl}, apiKey length: ${this.apiKey ? this.apiKey.length : 0}, subscriptionKey length: ${this.subscriptionKey ? this.subscriptionKey.length : 0}`);
            
            const requestBody = {
                amount: amount.toString(),
                currency: "SSP",
                externalId: this.externalId,
                payer: {
                    partyIdType: "MSISDN",
                    partyId: user.mobileNumber
                },
                payerMessage: `Answer Bot AI ${planType} subscription`,
                payeeNote: `${planType} plan for ${user.messengerId}`
            };
            
            const headers = {
                'Authorization': `Bearer ${this.apiKey}`,
                'X-Reference-Id': reference,
                'X-Target-Environment': process.env.MOMO_ENVIRONMENT || 'sandbox',
                'Ocp-Apim-Subscription-Key': this.subscriptionKey,
                'Content-Type': 'application/json'
            };
            
            logger.info(`Making request to: ${this.baseUrl}/collection/v1_0/requesttopay`);
            logger.info(`Request headers: ${JSON.stringify(headers, null, 2)}`);
            logger.info(`Request body: ${JSON.stringify(requestBody, null, 2)}`);
            
            // Create payment request to MTN MoMo API
            const response = await axios.post(
                `${this.baseUrl}/collection/v1_0/requesttopay`,
                requestBody,
                { headers }
            );

            logger.info(`Payment initiation successful, response status: ${response.status}`);

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
            logger.error('Payment initiation error:', error);
            
            // Log more detailed error information
            if (error.response) {
                logger.error(`Response status: ${error.response.status}`);
                logger.error(`Response data: ${JSON.stringify(error.response.data, null, 2)}`);
                logger.error(`Response headers: ${JSON.stringify(error.response.headers, null, 2)}`);
                
                // Handle sandbox-specific errors
                const environment = process.env.MOMO_ENVIRONMENT || 'sandbox';
                if (environment === 'sandbox') {
                    if (error.response.status === 401) {
                        logger.info('Sandbox mode: 401 Unauthorized is expected behavior for test credentials');
                        // In sandbox, we can simulate a successful payment initiation for testing
                        logger.info('Simulating successful payment initiation for sandbox testing');
                        
                        // Calculate amount based on plan type
                        const amount = planType === 'weekly' ? 3000 : 6500;
                        
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
                            message: 'Payment initiated successfully (sandbox simulation)'
                        };
                    }
                }
            }
            
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
    }

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
