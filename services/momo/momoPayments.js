// MTN MoMo Payment Operations
const axios = require('axios');
const logger = require('../../utils/logger');
const { v4: uuidv4 } = require('uuid');

class MomoPayments {
    constructor(config, auth) {
        this.config = config;
        this.auth = auth;
        
        // Use smart configuration for plan amounts
        this.planAmounts = {
            weekly: this.config.getPaymentAmount('weekly'),
            monthly: this.config.getPaymentAmount('monthly')
        };
        
        logger.info('MomoPayments initialized with smart configuration', {
            environment: this.config.environment,
            currency: this.config.getPaymentCurrency(),
            weeklyAmount: this.planAmounts.weekly,
            monthlyAmount: this.planAmounts.monthly
        });
    }

    async initiatePayment(user, planType) {
        if (!this.planAmounts[planType]) {
            throw new Error(`Invalid plan type: ${planType}`);
        }

        const amount = this.planAmounts[planType];
        const referenceId = uuidv4();
        const externalId = uuidv4();
        const endpoint = `${this.config.baseUrl}/collection/v1_0/requesttopay`;

        let requestBody, headers;
        
        try {
            logger.info('Initiating MoMo payment', {
                user: user.messengerId,
                planType,
                amount,
                referenceId,
                externalId,
                environment: this.config.environment
            });

            // Ensure we have a valid token
            await this.auth.getValidToken();

            // Normalize payer MSISDN for production (e.g., 092xxxxxxx -> 21192xxxxxxx)
            const payerMsisdn = this.formatMSISDN(user.paymentMobileNumber || user.mobileNumber);

            // Build request exactly like successful test
            requestBody = {
                amount: amount.toString(),
                currency: this.config.getPaymentCurrency(),
                externalId: externalId,
                payer: {
                    partyIdType: 'MSISDN',
                    partyId: payerMsisdn
                },
                payerMessage: `Answer Bot AI ${planType} subscription`,
                payeeNote: `${planType} plan for user ${user.messengerId.slice(-8)}`
            };

            // Use exact same headers as successful test
            headers = {
                'Authorization': `Bearer ${this.auth.token}`,
                'X-Reference-Id': referenceId,
                'X-Target-Environment': this.config.targetEnvironment,
                'Ocp-Apim-Subscription-Key': this.config.subscriptionKey,
                'Content-Type': 'application/json'
            };

            const response = await axios.post(endpoint, requestBody, {
                headers,
                timeout: 15000
            });

            if (response.status === 202) {
                // Payment request accepted
                logger.info('Payment request accepted', {
                    referenceId,
                    externalId,
                    user: user.messengerId,
                    status: response.status
                });

                return {
                    success: true,
                    reference: referenceId,
                    externalId: externalId,
                    status: 'pending',
                    amount,
                    planType
                };
            } else {
                throw new Error(`Unexpected response status: ${response.status}`);
            }

        } catch (error) {
            logger.error('Payment initiation failed', {
                referenceId,
                externalId,
                user: user.messengerId,
                planType,
                amount,
                error: error.message,
                status: error.response?.status,
                data: error.response?.data,
                requestBody: requestBody,
                headers: headers
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
        
        // Use EUR for sandbox, SSP for production
        const currency = this.config.environment === 'sandbox' ? 'EUR' : 'SSP';
        
        return {
            amount: amount.toString(),
            currency: currency,
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
        
        // Basic numeric validation
        if (!/^\d{8,15}$/.test(cleanNumber)) {
            throw new Error('Invalid phone number format');
        }

        // Normalize for production (South Sudan MSISDN): 092xxxxxxx -> 21192xxxxxxx
        // Keep sandbox/dev unchanged to preserve test flows
        if (this.config.environment === 'production') {
            // If already in E.164 for South Sudan, keep as-is
            if (cleanNumber.startsWith('211')) {
                return cleanNumber;
            }
            // If in local MTN SS format 092XXXXXXX, convert to 21192XXXXXXX
            if (/^092\d{7}$/.test(cleanNumber)) {
                return '211' + cleanNumber.slice(1);
            }
        }

        // Default: return cleaned number unchanged
        return cleanNumber;
    }

    generateReference(messengerId) {
        // Use UUID format like our successful test
        return uuidv4();
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
