// Main MTN MoMo Service - Clean Integration
const MomoConfig = require('./momo/momoConfig');
const MomoAuth = require('./momo/momoAuth');
const MomoPayments = require('./momo/momoPayments');
const MomoApiUser = require('./momo/momoApiUser');
const logger = require('../utils/logger');
const User = require('../models/user');
const SandboxBypassService = require('./sandboxBypassService');

class MomoService {
    constructor() {
        try {
            this.config = new MomoConfig();
            this.auth = new MomoAuth(this.config);
            this.payments = new MomoPayments(this.config, this.auth);
            this.apiUser = new MomoApiUser(this.config);
            this.sandboxBypass = new SandboxBypassService();
            
            logger.info('MomoService initialized successfully', this.config.getDebugInfo());
        } catch (error) {
            logger.error('MomoService initialization failed', { error: error.message });
            throw error;
        }
    }

    // Payment Operations
    async initiatePayment(user, planType) {
        try {
            // Normal payment flow - let real sandbox payment go through
            const result = await this.payments.initiatePayment(user, planType);
            
            // Update user with payment session
            user.paymentSession = {
                planType,
                amount: result.amount,
                startTime: new Date(),
                status: 'pending',
                reference: result.reference
            };
            await user.save();

            logger.info('Payment request initiated successfully', {
                user: user.messengerId,
                planType,
                amount: result.amount,
                reference: result.reference
            });

            // Check for sandbox bypass after successful payment initiation
            if (user.paymentMobileNumber && this.sandboxBypass.shouldBypassPayment(user.paymentMobileNumber)) {
                logger.info('🔓 [SANDBOX BYPASS] Simulating callback after real payment initiation', {
                    user: user.messengerId,
                    phoneNumber: user.paymentMobileNumber,
                    planType,
                    reference: result.reference
                });
                
                // Simulate the callback that MTN would normally send
                const fakeCallbackData = await this.sandboxBypass.simulatePaymentCallback(
                    user, 
                    planType, 
                    result.reference
                );
                
                // Directly process successful payment since we have the user object
                await this.processSuccessfulPayment(user);
                
                // Mark result as bypassed for logging
                result.sandboxBypass = true;
                
                // Update result to indicate immediate success for bypass
                result.immediateSuccess = true;
                result.finalStage = 'subscribed';
            }

            return result;
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

            // Process the callback
            const result = await this.payments.handlePaymentCallback(callbackData);
            
            // Update user payment session
            if (user.paymentSession) {
                user.paymentSession.status = callbackData.status;
                user.paymentSession.processedAt = new Date();
            }

            // Handle payment result
            if (result.successful) {
                await this.processSuccessfulPayment(user);
            } else if (callbackData.status === 'FAILED') {
                await this.processFailedPayment(user);
            }

            await user.save();
            
            // Log the callback for debugging
            if (req) {
                logger.info('Payment callback processed', {
                    reference: result.reference,
                    status: result.status,
                    user: user.messengerId,
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
            const { planType, amount, reference } = user.paymentSession;
            
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

            logger.paymentSuccess(user.messengerId, reference, amount);
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
