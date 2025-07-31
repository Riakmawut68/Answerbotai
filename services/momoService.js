const axios = require('axios');
const logger = require('../utils/logger');
const User = require('../models/user'); // Avoid circular dependencies

class MomoService {
    constructor() {
        this.environment = process.env.MOMO_ENVIRONMENT || 'sandbox';
        this.validateConfiguration();
        this.initializeCredentials();
        this.callbackHost = process.env.CALLBACK_HOST;
        
        logger.info(`MoMo service initialized in ${this.environment} mode`);
    }

    initializeCredentials() {
        this.apiUserId = process.env.MOMO_API_USER_ID;
        this.apiKey = process.env.MOMO_API_KEY;
        this.subscriptionKey = process.env.MOMO_SUBSCRIPTION_KEY;
        this.baseUrl = process.env.MOMO_BASE_URL || 
            (this.environment === 'sandbox' 
                ? 'https://sandbox.momodeveloper.mtn.com' 
                : 'https://api.momoapi.mtn.com');
        this.externalId = process.env.MOMO_EXTERNAL_ID || '123456789';

        // Mask sensitive keys in logs
        this.maskedApiKey = this.maskString(this.apiKey);
        this.maskedSubKey = this.maskString(this.subscriptionKey);
    }

    validateConfiguration() {
        const requiredVars = ['MOMO_API_USER_ID', 'MOMO_API_KEY', 'MOMO_SUBSCRIPTION_KEY'];
        const missingVars = requiredVars.filter(v => !process.env[v]);

        if (missingVars.length > 0 && this.environment !== 'sandbox') {
            const errorMsg = `Missing required MoMo variables: ${missingVars.join(', ')}`;
            logger.error(errorMsg);
            throw new Error(errorMsg);
        }

        if (this.environment === 'sandbox' && missingVars.length > 0) {
            logger.warn('Using sandbox mode with incomplete credentials - some operations may fail');
        }
    }

    async initiatePayment(user, planType) {
        const amount = this.calculatePlanAmount(planType);
        const reference = `PAY-${Date.now()}-${user.messengerId.slice(-4)}`;
        const endpoint = `${this.baseUrl}/collection/v1_0/requesttopay`;

        try {
            logger.info(`Initiating ${planType} payment (${amount} SSP) for ${user.paymentMobileNumber || user.mobileNumber}, Ref: ${reference}`);

            const requestBody = this.buildRequestBody(user, planType, amount);
            const headers = this.getRequestHeaders(reference);

            const response = await axios.post(endpoint, requestBody, { headers, timeout: 15000 });
            
            if (response.status >= 200 && response.status < 300) {
                return await this.handleSuccess(user, planType, amount, reference);
            }
            
            throw new Error(`Unexpected status: ${response.status}`);
        } catch (error) {
            return this.handlePaymentError(error, user, planType, amount, reference);
        }
    }

    async checkPaymentStatus(reference) {
        const endpoint = `${this.baseUrl}/collection/v1_0/requesttopay/${reference}`;
        
        try {
            const headers = {
                'Authorization': `Bearer ${this.apiKey}`,
                'X-Target-Environment': this.environment,
                'Ocp-Apim-Subscription-Key': this.subscriptionKey
            };

            const response = await axios.get(endpoint, { headers, timeout: 10000 });
            return response.data;
        } catch (error) {
            logger.error('Payment status check failed', {
                reference,
                error: error.message,
                environment: this.environment
            });
            throw error;
        }
    }

    async verifyPayment(reference) {
        try {
            const status = await this.checkPaymentStatus(reference);
            
            if (status.status === 'SUCCESSFUL') {
                logger.info(`Payment verified successfully for reference: ${reference}`);
                return { success: true, status: status.status };
            } else if (status.status === 'FAILED') {
                logger.warn(`Payment failed for reference: ${reference}`);
                return { success: false, status: status.status };
            } else {
                logger.info(`Payment still pending for reference: ${reference}, status: ${status.status}`);
                return { success: false, status: status.status, pending: true };
            }
        } catch (error) {
            logger.error('Payment verification failed', { reference, error: error.message });
            throw error;
        }
    }

    async handlePaymentCallback(callbackData) {
        try {
            logger.info('Processing payment callback', {
                reference: callbackData.reference,
                status: callbackData.status,
                environment: this.environment
            });

            // Validate callback data
            if (!callbackData.reference || !callbackData.status) {
                throw new Error('Invalid callback data: missing reference or status');
            }

            // Find user by payment reference
            const user = await User.findOne({
                'paymentSession.reference': callbackData.reference
            });

            if (!user) {
                logger.error('User not found for payment callback', { reference: callbackData.reference });
                throw new Error('User not found for payment reference');
            }

            // Update payment status
            if (user.paymentSession) {
                user.paymentSession.status = callbackData.status;
                user.paymentSession.processedAt = new Date();
            }

            // Handle successful payment
            if (callbackData.status === 'SUCCESSFUL') {
                await this.processSuccessfulPayment(user);
            } else if (callbackData.status === 'FAILED') {
                await this.processFailedPayment(user);
            }

            await user.save();
            
            logger.info('Payment callback processed successfully', {
                user: user.messengerId,
                reference: callbackData.reference,
                status: callbackData.status
            });

            return { success: true };
        } catch (error) {
            logger.error('Payment callback processing failed', {
                error: error.message,
                callbackData
            });
            throw error;
        }
    }

    async processSuccessfulPayment(user) {
        const { planType, amount } = user.paymentSession;
        
        // Update subscription
        const duration = planType === 'weekly' ? 7 : 30;
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + duration);

        user.subscription = {
            planType,
            amount,
            startDate: new Date(),
            expiryDate,
            status: 'active'
        };

        // Clear payment session
        user.paymentSession = null;
        user.stage = 'subscribed';

        logger.info('Subscription activated successfully', {
            user: user.messengerId,
            planType,
            amount,
            expiryDate
        });
    }

    async processFailedPayment(user) {
        // Clear payment session
        user.paymentSession = null;
        user.stage = 'payment_failed';

        logger.info('Payment failed - session cleared', {
            user: user.messengerId,
            reference: user.paymentSession?.reference
        });
    }

    // ============ HELPER METHODS =============
    calculatePlanAmount(planType) {
        const plans = {
            weekly: 3000,
            monthly: 6500
        };
        if (!plans[planType]) throw new Error(`Invalid plan type: ${planType}`);
        return plans[planType];
    }

    buildRequestBody(user, planType, amount) {
        return {
            amount: amount.toString(),
            currency: "SSP",
            externalId: this.externalId,
            payer: {
                partyIdType: "MSISDN",
                partyId: user.paymentMobileNumber || user.mobileNumber
            },
            payerMessage: `Answer Bot AI ${planType} subscription`,
            payeeNote: `${planType} plan for ${user.messengerId}`,
            callbackUrl: this.callbackHost ? `${this.callbackHost}/momo/callback` : undefined
        };
    }

    getRequestHeaders(reference) {
        return {
            'Authorization': `Bearer ${this.apiKey}`,
            'X-Reference-Id': reference,
            'X-Target-Environment': this.environment,
            'Ocp-Apim-Subscription-Key': this.subscriptionKey,
            'Content-Type': 'application/json',
            'X-Callback-Url': this.callbackHost ? `${this.callbackHost}/momo/callback` : undefined
        };
    }

    async handleSuccess(user, planType, amount, reference) {
        user.paymentSession = {
            planType,
            amount,
            startTime: new Date(),
            status: 'pending',
            reference
        };
        await user.save();

        logger.info(`Payment initiated successfully for ${user.messengerId}, Ref: ${reference}`);
        return { success: true, reference };
    }

    handlePaymentError(error, user, planType, amount, reference) {
        const errorContext = {
            reference,
            user: user.messengerId,
            planType,
            environment: this.environment
        };

        logger.error('Payment initiation failed', {
            message: error.message,
            ...errorContext
        });

        // Sandbox simulation
        if (this.environment === 'sandbox' && error.response?.status === 401) {
            logger.warn('Sandbox 401 error detected - simulating success');
            return this.handleSuccess(user, planType, amount, reference);
        }

        // Detailed error diagnostics
        if (error.response) {
            logger.error('API Error Response:', {
                status: error.response.status,
                headers: error.response.headers,
                data: error.response.data
            });
        } else if (error.request) {
            logger.error('No response received', error.request);
        }

        throw new Error(`Payment initiation failed: ${error.message}`);
    }

    maskString(value, visibleChars = 4) {
        if (!value) return 'null';
        return value.slice(0, visibleChars) + '*'.repeat(value.length - visibleChars);
    }
}

module.exports = MomoService;
