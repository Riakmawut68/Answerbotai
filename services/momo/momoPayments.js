// MTN MoMo Payment Operations
const axios = require('axios');
const logger = require('../../utils/logger');
const { v4: uuidv4 } = require('uuid');

class MomoPayments {
    constructor(config, auth) {
        this.config = config;
        this.auth = auth;
        this.planAmounts = {
            weekly: 3000,
            monthly: 6500
        };
    }

    async initiatePayment(user, planType) {
        if (!this.planAmounts[planType]) {
            throw new Error(`Invalid plan type: ${planType}`);
        }

        const amount = this.planAmounts[planType];
        const reference = this.generateReference(user.messengerId);
        const endpoint = `${this.config.baseUrl}/collection/v1_0/requesttopay`;

        try {
            logger.info('Initiating MoMo payment', {
                user: user.messengerId,
                planType,
                amount,
                reference,
                environment: this.config.environment
            });

            // Ensure we have a valid token
            await this.auth.getValidToken();

            const requestBody = this.buildPaymentRequest(user, planType, amount, reference);
            const headers = this.auth.getAuthenticatedHeaders(reference);
            
            // Add callback URL
            headers['X-Callback-Url'] = `${this.config.callbackHost}/momo/callback`;

            const response = await axios.post(endpoint, requestBody, {
                headers,
                timeout: 15000
            });

            if (response.status === 202) {
                // Payment request accepted
                logger.info('Payment request accepted', {
                    reference,
                    user: user.messengerId,
                    status: response.status
                });

                return {
                    success: true,
                    reference,
                    status: 'pending',
                    amount,
                    planType
                };
            } else {
                throw new Error(`Unexpected response status: ${response.status}`);
            }

        } catch (error) {
            logger.error('Payment initiation failed', {
                reference,
                user: user.messengerId,
                planType,
                amount,
                error: error.message,
                status: error.response?.status,
                data: error.response?.data
            });

            throw new Error(`Payment initiation failed: ${error.message}`);
        }
    }

    async checkPaymentStatus(reference) {
        const endpoint = `${this.config.baseUrl}/collection/v1_0/requesttopay/${reference}`;

        try {
            await this.auth.getValidToken();
            const headers = this.auth.getAuthenticatedHeaders();

            const response = await axios.get(endpoint, {
                headers,
                timeout: 10000
            });

            if (response.status === 200) {
                const status = response.data.status;
                const isSuccessful = status === 'SUCCESSFUL';

                logger.info('Payment status checked', {
                    reference,
                    status,
                    successful: isSuccessful
                });

                return {
                    success: true,
                    status,
                    successful: isSuccessful,
                    data: response.data
                };
            } else {
                throw new Error(`Status check failed with status: ${response.status}`);
            }

        } catch (error) {
            logger.error('Payment status check failed', {
                reference,
                error: error.message,
                status: error.response?.status,
                data: error.response?.data
            });

            return {
                success: false,
                error: error.message,
                status: 'unknown'
            };
        }
    }

    async verifyPayment(reference) {
        try {
            const result = await this.checkPaymentStatus(reference);
            
            if (result.success) {
                return {
                    success: result.successful,
                    status: result.status,
                    verified: result.successful,
                    data: result.data
                };
            } else {
                return {
                    success: false,
                    status: 'error',
                    verified: false,
                    error: result.error
                };
            }
        } catch (error) {
            logger.error('Payment verification failed', {
                reference,
                error: error.message
            });

            return {
                success: false,
                status: 'error',
                verified: false,
                error: error.message
            };
        }
    }

    buildPaymentRequest(user, planType, amount, reference) {
        const msisdn = this.formatMSISDN(user.paymentMobileNumber || user.mobileNumber);
        
        return {
            amount: amount.toString(),
            currency: this.config.currency,
            externalId: reference,
            payer: {
                partyIdType: "MSISDN",
                partyId: msisdn
            },
            payerMessage: `Answer Bot AI ${planType} subscription`,
            payeeNote: `${planType} plan for user ${user.messengerId.slice(-8)}`
        };
    }

    formatMSISDN(phoneNumber) {
        if (!phoneNumber) {
            throw new Error('Phone number is required');
        }

        // Remove any non-digit characters
        const cleanNumber = phoneNumber.replace(/\D/g, '');
        
        // Validate format
        if (!/^\d{8,15}$/.test(cleanNumber)) {
            throw new Error('Invalid phone number format');
        }

        return cleanNumber;
    }

    generateReference(messengerId) {
        const timestamp = Date.now();
        const userSuffix = messengerId.slice(-4);
        return `PAY-${timestamp}-${userSuffix}`;
    }

    calculatePlanAmount(planType) {
        if (!this.planAmounts[planType]) {
            throw new Error(`Invalid plan type: ${planType}`);
        }
        return this.planAmounts[planType];
    }

    async handlePaymentCallback(callbackData) {
        try {
            logger.info('Processing payment callback', {
                reference: callbackData.referenceId,
                status: callbackData.status
            });

            const reference = callbackData.referenceId;
            const status = callbackData.status;
            const isSuccessful = status === 'SUCCESSFUL';

            // Verify the payment status by checking with MoMo API
            const verification = await this.verifyPayment(reference);

            return {
                reference,
                status,
                successful: isSuccessful && verification.verified,
                verified: verification.verified,
                callbackData
            };

        } catch (error) {
            logger.error('Payment callback processing failed', {
                error: error.message,
                callbackData
            });

            throw new Error(`Callback processing failed: ${error.message}`);
        }
    }
}

module.exports = MomoPayments;
