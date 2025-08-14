const logger = require('../utils/logger');
const config = require('../config');

class SandboxBypassService {
    constructor() {
        this.enabled = config.app.environment === 'development' && config.sandbox?.enableBypass;
        this.testPhoneNumbers = config.sandbox?.testPhoneNumbers || [];
        this.hardcodedTestNumber = config.momo.getTestPhoneNumber(); // 256770000000
        
        if (this.enabled) {
            logger.info('SandboxBypassService initialized', {
                enabled: this.enabled,
                testPhoneNumbers: this.testPhoneNumbers,
                hardcodedTestNumber: this.hardcodedTestNumber
            });
        }
    }

    /**
     * Check if a phone number should trigger sandbox bypass
     * Only triggers for specific test numbers in sandbox
     */
    shouldBypassPayment(phoneNumber) {
        if (!this.enabled) return false;
        
        // Check if it's a test number from config
        const isTestNumber = this.testPhoneNumbers.includes(phoneNumber);
        
        if (isTestNumber) {
            logger.warn('🔓 [SANDBOX BYPASS TRIGGERED]', {
                phoneNumber,
                hardcodedTestNumber: this.hardcodedTestNumber,
                action: 'Payment bypass enabled for sandbox testing - using hardcoded test number'
            });
        }
        
        return isTestNumber;
    }

    /**
     * Simulate a successful payment callback using hardcoded test number
     * This simulates what MTN MoMo would send back to our webhook
     */
    async simulatePaymentCallback(user, planType, realReferenceId) {
        try {
            logger.warn('🎭 [SANDBOX BYPASS CALLBACK SIMULATION]', {
                user: user.messengerId,
                userPhoneNumber: user.paymentMobileNumber,
                hardcodedTestNumber: this.hardcodedTestNumber,
                planType,
                realReferenceId,
                action: 'Simulating MTN MoMo callback using hardcoded test number'
            });

            // Create fake callback data using hardcoded test number
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

    /**
     * Get hardcoded test number used for sandbox bypass
     */
    getHardcodedTestNumber() {
        return this.hardcodedTestNumber;
    }
}

module.exports = SandboxBypassService;
