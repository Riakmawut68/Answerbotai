// Main MTN MoMo Service - Clean Integration
const MomoConfig = require('./momo/momoConfig');
const MomoAuth = require('./momo/momoAuth');
const MomoPayments = require('./momo/momoPayments');
const MomoApiUser = require('./momo/momoApiUser');
const logger = require('../utils/logger');
const User = require('../models/user');
const SandboxBypassService = require('./sandboxBypassService');
const PaymentRequest = require('../models/paymentRequest');

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

            // Persist durable mapping for callbacks
            await PaymentRequest.create({
                referenceId: result.reference,
                externalId: result.externalId,
                messengerId: user.messengerId,
                planType,
                amount: result.amount,
                status: 'pending'
            });
            
            // Update user with payment session
            user.paymentSession = {
                planType,
                amount: result.amount,
                startTime: new Date(),
                status: 'pending',
                reference: result.reference,
                externalId: result.externalId
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
                logger.info('🔓 [SANDBOX BYPASS ACTIVATED] Real payment initiated but will auto-complete for testing', {
                    user: user.messengerId,
                    phoneNumber: user.paymentMobileNumber,
                    planType,
                    reference: result.reference,
                    flow: 'sandbox-bypass'
                });
                
                // Simulate the callback that MTN would normally send
                const fakeCallbackData = await this.sandboxBypass.simulatePaymentCallback(
                    user, 
                    planType, 
                    result.reference
                );
                
                // Send the fake callback to the webhook handler (normal flow)
                // This ensures the user gets the success message
                await this.handlePaymentCallback(fakeCallbackData);
                
                // IMPORTANT: For bypass, we need to send the success message directly
                // since we're not going through the webhook route
                if (fakeCallbackData.status === 'SUCCESSFUL') {
                    // Reload user to get updated subscription data after processSuccessfulPayment
                    const User = require('../models/user');
                    const updatedUser = await User.findOne({ messengerId: user.messengerId });

                    const timezone = require('../utils/timezone');
                    const expiryDate = timezone.toJubaTime(updatedUser.subscription.expiryDate);

                    // Use configured display amounts and currency (4,000 / 10,000 SSP)
                    const displayAmount = planType === 'weekly'
                        ? this.config.displayAmounts.weekly
                        : this.config.displayAmounts.monthly;
                    const displayCurrency = this.config.displayCurrency;

                    const successMessage =
                        '🎉 Payment successful! Your subscription is now active.\n\n' +
                        '💳 **Plan Details:**\n' +
                        `• Plan: ${planType === 'weekly' ? 'Weekly Plan' : 'Monthly Plan'}\n` +
                        `• Cost: ${displayAmount.toLocaleString()} ${displayCurrency}\n` +
                        `• Messages: 30 per day\n` +
                        `• Expires: ${expiryDate.format('YYYY-MM-DD HH:mm:ss')}\n\n` +
                        '🚀 **What\'s Next:**\n' +
                        '• Start asking questions immediately\n' +
                        '• Daily limit resets at midnight (Juba time)\n' +
                        '• Use \'status\' command to check your usage\n\n' +
                        'Enjoy using Answer Bot AI! 🤖';

                    const messengerService = require('./messengerService');
                    await messengerService.sendText(user.messengerId, successMessage);
                    
                    logger.info('🔓 [SANDBOX BYPASS COMPLETE] Success message sent, user subscription activated', {
                        user: user.messengerId,
                        planType,
                        expiryDate: expiryDate.format('YYYY-MM-DD HH:mm:ss'),
                        flow: 'sandbox-bypass',
                        action: 'User can now use bot immediately - no waiting for real payment'
                    });
                }
                
                // Mark result as bypassed for logging
                result.sandboxBypass = true;
            }

            // Quick post-init polling to surface early outcomes even if webhook delays
            try {
                const pollDelaysMs = [0, 10000, 30000];
                for (const delay of pollDelaysMs) {
                    if (delay > 0) await new Promise(r => setTimeout(r, delay));
                    const status = await this.checkPaymentStatus(result.reference);
                    if (status.success && (status.successful || status.status === 'FAILED')) {
                        // Create a synthetic callback-like object to reuse existing handler
                        const callbackData = {
                            referenceId: result.reference,
                            status: status.status
                        };
                        await this.handlePaymentCallback(callbackData);
                        break;
                    }
                }
            } catch (pollError) {
                logger.warn('Post-init quick polling encountered an issue', { error: pollError.message });
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
            // Attempt to resolve missing referenceId using externalId via durable mapping
            if (!callbackData.referenceId && callbackData.externalId) {
                const pr = await PaymentRequest.findOne({ externalId: callbackData.externalId });
                if (pr?.referenceId) {
                    callbackData.referenceId = pr.referenceId;
                }
            }

            // Validate callback data
            if (!callbackData.referenceId || !callbackData.status) {
                throw new Error('Invalid callback data: missing referenceId or status');
            }

            // Find user by payment reference (or via PaymentRequest fallback)
            let user = await User.findOne({ 'paymentSession.reference': callbackData.referenceId });
            if (!user) {
                const pr = await PaymentRequest.findOne({ referenceId: callbackData.referenceId });
                if (pr?.messengerId) {
                    user = await User.findOne({ messengerId: pr.messengerId });
                }
            }

            if (!user) {
                logger.error('User not found for payment callback', { 
                    reference: callbackData.referenceId 
                });
                throw new Error('User not found for payment reference');
            }

            // Process the callback
            const result = await this.payments.handlePaymentCallback(callbackData);

            // Persist status on PaymentRequest
            await PaymentRequest.updateOne(
                { referenceId: result.reference },
                { status: result.status, reason: callbackData.reason || undefined, rawCallback: callbackData }
            );
            
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
