// MTN MoMo Configuration Management
require('dotenv').config();

class MomoConfig {
    constructor() {
        this.environment = process.env.MOMO_ENVIRONMENT || 'sandbox';
        this.targetEnvironment = process.env.MOMO_TARGET_ENVIRONMENT || this.environment;
        this.validateConfiguration();
        this.initializeCredentials();
    }

    validateConfiguration() {
        const requiredVars = [
            'MOMO_API_USER_ID',
            'MOMO_API_KEY', 
            'MOMO_SUBSCRIPTION_KEY',
            'CALLBACK_HOST'
        ];

        const missingVars = requiredVars.filter(v => !process.env[v]);
        
        if (missingVars.length > 0) {
            const errorMsg = `Missing required MoMo environment variables: ${missingVars.join(', ')}`;
            console.error(errorMsg);
            throw new Error(errorMsg);
        }

        // Validate format of credentials
        if (!this.isValidUUID(process.env.MOMO_API_USER_ID)) {
            throw new Error('MOMO_API_USER_ID must be a valid UUID');
        }

        if (!this.isValidUUID(process.env.MOMO_API_KEY)) {
            throw new Error('MOMO_API_KEY must be a valid UUID');
        }

        if (!this.isValidUUID(process.env.MOMO_SUBSCRIPTION_KEY)) {
            throw new Error('MOMO_SUBSCRIPTION_KEY must be a valid UUID');
        }

        if (!process.env.CALLBACK_HOST.startsWith('http')) {
            throw new Error('CALLBACK_HOST must be a valid HTTP/HTTPS URL');
        }
    }

    initializeCredentials() {
        this.apiUserId = process.env.MOMO_API_USER_ID;
        this.apiKey = process.env.MOMO_API_KEY;
        this.subscriptionKey = process.env.MOMO_SUBSCRIPTION_KEY;
        this.callbackHost = process.env.CALLBACK_HOST;
        
        // Prefer explicit env override, else use official defaults
        // Sandbox: https://sandbox.momodeveloper.mtn.com
        // Production: https://proxy.momoapi.mtn.com (correct public hostname)
        const envBaseUrl = process.env.MOMO_BASE_URL;
        this.baseUrl = envBaseUrl || (this.environment === 'sandbox'
            ? 'https://sandbox.momodeveloper.mtn.com'
            : 'https://proxy.momoapi.mtn.com');
            
        // Smart Currency & Amount Configuration
        // Frontend always shows SSP prices, backend converts based on environment
        this.displayCurrency = 'SSP'; // What users see in frontend
        this.displayAmounts = {
            weekly: 4000,   // Always show 4,000 SSP
            monthly: 10000   // Always show 10,000 SSP
        };
        
        console.log(`MoMo Config initialized for ${this.environment} environment`);
        console.log(`MoMo Base URL: ${this.baseUrl}`);
    }

    isValidUUID(str) {
        // Accept both UUID format (with dashes) and 32-character hex format (without dashes)
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        const hexRegex = /^[0-9a-f]{32}$/i;
        return uuidRegex.test(str) || hexRegex.test(str);
    }

    getAuthHeader() {
        return Buffer.from(`${this.apiUserId}:${this.apiKey}`).toString('base64');
    }

    getBaseHeaders() {
        return {
            'Ocp-Apim-Subscription-Key': this.subscriptionKey,
            'Content-Type': 'application/json',
            'X-Target-Environment': this.targetEnvironment
        };
    }

    maskCredential(value, visibleChars = 4) {
        if (!value) return 'null';
        return value.slice(0, visibleChars) + '*'.repeat(Math.max(0, value.length - visibleChars));
    }

    // Smart Currency & Amount Configuration Methods
    getPaymentCurrency() {
        return this.environment === 'sandbox' ? 'EUR' : 'SSP';
    }
    
    getPaymentAmount(planType) {
        if (this.environment === 'sandbox') {
            // Sandbox: Convert SSP to EUR for testing
            const sspAmount = this.displayAmounts[planType];
            return sspAmount === 4000 ? 1 : 2; // 4000 SSP → 1 EUR, 10000 SSP → 2 EUR
        } else {
            // Production: Use actual SSP amounts
            return this.displayAmounts[planType];
        }
    }
    
    // Test phone number for sandbox
    getTestPhoneNumber() {
        return this.environment === 'sandbox' ? '256770000000' : null;
    }

    getDebugInfo() {
        return {
            environment: this.environment,
            baseUrl: this.baseUrl,
            displayCurrency: this.displayCurrency,
            displayAmounts: this.displayAmounts,
            paymentCurrency: this.getPaymentCurrency(),
            apiUserId: this.maskCredential(this.apiUserId),
            apiKey: this.maskCredential(this.apiKey),
            subscriptionKey: this.maskCredential(this.subscriptionKey),
            callbackHost: this.callbackHost
        };
    }
}

module.exports = MomoConfig;
