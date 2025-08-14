const logger = require('../utils/logger');
const config = require('../config');

class SandboxBypassService {
    constructor() {
        this.enabled = config.app.environment === 'development' && config.sandbox?.enableBypass;
        this.testPhoneNumbers = config.sandbox?.testPhoneNumbers || [];
        
        if (this.enabled) {
            logger.info('SandboxBypassService initialized', {
                enabled: this.enabled,
                testPhoneNumbers: this.testPhoneNumbers
            });
        }
    }

    /**
     * Check if a phone number should trigger sandbox bypass
     */
    shouldBypassPayment(phoneNumber) {
        if (!this.enabled) return false;
        
        const shouldBypass = this.testPhoneNumbers.includes(phoneNumber);
        
        if (shouldBypass) {
            logger.warn('🔓 [SANDBOX BYPASS TRIGGERED]', {
                phoneNumber,
                action: 'Payment bypass enabled for sandbox testing'
            });
        }
        
        return shouldBypass;
    }

    /**
     * Simulate a successful payment callback after real sandbox payment initiation
     * This simulates what MTN MoMo would send back to our webhook
     */
    async simulatePaymentCallback(user, planType, realReferenceId) {
        try {
            logger.warn('🎭 [SANDBOX BYPASS CALLBACK SIMULATION]', {
                user: user.messengerId,
                phoneNumber: user.paymentMobileNumber,
                planType,
                realReferenceId,
                action: 'Simulating MTN MoMo callback after real sandbox payment'
            });

            // Create fake callback data that matches MTN MoMo webhook format
            const fakeCallbackData = {
                referenceId: realReferenceId, // Use the real reference from MTN sandbox
                status: 'SUCCESSFUL',
                amount: config.momo.getPaymentAmount(planType),
                currency: config.momo.getPaymentCurrency(),
                externalId: user.messengerId,
                payerMessage: 'Sandbox bypass payment',
                payeeNote: 'Test payment for development',
                financialTransactionId: `SANDBOX_${Date.now()}`,
                reason: 'SUCCESSFUL'
            };

            // Return the fake callback data for webhook processing
            return fakeCallbackData;

        } catch (error) {
            logger.error('Sandbox bypass callback simulation failed', {
                user: user.messengerId,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Check if current environment supports bypass
     */
    isBypassEnabled() {
        return this.enabled;
    }

    /**
     * Get test phone numbers for admin reference
     */
    getTestPhoneNumbers() {
        return [...this.testPhoneNumbers];
    }
}

module.exports = SandboxBypassService;
