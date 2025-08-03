// Main MTN MoMo Service - Clean Integration
const MomoConfig = require('./momoConfig');
const MomoAuth = require('./momoAuth');
const MomoPayments = require('./momoPayments');
const MomoApiUser = require('./momoApiUser');
const logger = require('../../utils/logger');

class MomoService {
    constructor() {
        try {
            this.config = new MomoConfig();
            this.auth = new MomoAuth(this.config);
            this.payments = new MomoPayments(this.config, this.auth);
            this.apiUser = new MomoApiUser(this.config);
            
            logger.info('MomoService initialized successfully', this.config.getDebugInfo());
        } catch (error) {
            logger.error('MomoService initialization failed', { error: error.message });
            throw error;
        }
    }

    // Payment Operations
    async initiatePayment(user, planType) {
        try {
            return await this.payments.initiatePayment(user, planType);
        } catch (error) {
            logger.error('Payment initiation failed', {
                user: user.messengerId,
                planType,
                error: error.message
            });
            throw error;
        }
    }

    async checkPaymentStatus(reference) {
        return await this.payments.checkPaymentStatus(reference);
    }

    async verifyPayment(reference) {
        return await this.payments.verifyPayment(reference);
    }

    async handlePaymentCallback(callbackData, req = null) {
        try {
            const result = await this.payments.handlePaymentCallback(callbackData);
            
            // Log the callback for debugging
            if (req) {
                logger.info('Payment callback received', {
                    reference: result.reference,
                    status: result.status,
                    ip: req.ip,
                    userAgent: req.get('User-Agent')
                });
            }
            
            return result;
        } catch (error) {
            logger.error('Payment callback handling failed', {
                error: error.message,
                callbackData
            });
            throw error;
        }
    }

    // User Management Operations
    async processSuccessfulPayment(user) {
        try {
            const { planType, amount } = user.paymentSession;
            
            // Calculate subscription duration
            const duration = planType === 'weekly' ? 7 : 30;
            const expiryDate = new Date();
            expiryDate.setDate(expiryDate.getDate() + duration);

            // Update user subscription
            user.subscription = {
                planType,
                amount,
                startDate: new Date(),
                expiryDate,
                status: 'active'
            };

            // Clear payment session and update stage
            user.paymentSession = null;
            user.stage = 'subscribed';

            await user.save();

            logger.info('Subscription activated successfully', {
                user: user.messengerId,
                planType,
                amount,
                expiryDate: expiryDate.toISOString()
            });

            return {
                success: true,
                subscription: user.subscription
            };

        } catch (error) {
            logger.error('Failed to process successful payment', {
                user: user.messengerId,
                error: error.message
            });
            throw error;
        }
    }

    async processFailedPayment(user) {
        try {
            const reference = user.paymentSession?.reference;
            
            // Clear payment session and update stage
            user.paymentSession = null;
            user.stage = 'payment_failed';

            await user.save();

            logger.info('Payment failure processed', {
                user: user.messengerId,
                reference
            });

            return {
                success: true,
                stage: user.stage
            };

        } catch (error) {
            logger.error('Failed to process payment failure', {
                user: user.messengerId,
                error: error.message
            });
            throw error;
        }
    }

    // Helper Methods
    calculatePlanAmount(planType) {
        return this.payments.calculatePlanAmount(planType);
    }

    // Setup and Testing Operations
    async testConnection() {
        try {
            logger.info('Testing MoMo service connection');
            
            const authTest = await this.auth.testAuthentication();
            
            if (authTest.success) {
                logger.info('MoMo service connection test passed');
                return {
                    success: true,
                    message: 'Connection test passed',
                    config: this.config.getDebugInfo()
                };
            } else {
                throw new Error(authTest.error);
            }

        } catch (error) {
            logger.error('MoMo service connection test failed', { error: error.message });
            return {
                success: false,
                error: error.message,
                config: this.config.getDebugInfo()
            };
        }
    }

    async setupNewCredentials() {
        return await this.apiUser.setupNewCredentials();
    }

    async checkApiUser() {
        return await this.apiUser.checkApiUser(this.config.apiUserId);
    }

    // Diagnostic Methods
    getServiceInfo() {
        return {
            config: this.config.getDebugInfo(),
            tokenValid: this.auth.isTokenValid(),
            tokenExpiry: this.auth.tokenExpiry
        };
    }

    async diagnose() {
        try {
            logger.info('Running MoMo service diagnostics');
            
            const results = {
                config: this.config.getDebugInfo(),
                apiUserExists: false,
                authenticationWorks: false,
                errors: []
            };

            // Check if API User exists
            try {
                const userCheck = await this.checkApiUser();
                results.apiUserExists = userCheck.exists;
            } catch (error) {
                results.errors.push(`API User check failed: ${error.message}`);
            }

            // Test authentication
            try {
                const authTest = await this.auth.testAuthentication();
                results.authenticationWorks = authTest.success;
                if (!authTest.success) {
                    results.errors.push(`Authentication failed: ${authTest.error}`);
                }
            } catch (error) {
                results.errors.push(`Authentication test failed: ${error.message}`);
            }

            results.overallStatus = results.apiUserExists && results.authenticationWorks ? 'healthy' : 'issues_detected';

            logger.info('MoMo service diagnostics completed', {
                status: results.overallStatus,
                errorsCount: results.errors.length
            });

            return results;

        } catch (error) {
            logger.error('MoMo service diagnostics failed', { error: error.message });
            return {
                overallStatus: 'diagnostic_failed',
                error: error.message
            };
        }
    }
}

module.exports = MomoService;
