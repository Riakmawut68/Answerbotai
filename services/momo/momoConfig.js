// MTN MoMo Configuration Management
require('dotenv').config();

class MomoConfig {
    constructor() {
        this.environment = process.env.MOMO_ENVIRONMENT || 'sandbox';
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
        
        this.baseUrl = this.environment === 'sandbox' 
            ? 'https://sandbox.momodeveloper.mtn.com'
            : 'https://api.momoapi.mtn.com';
            
        this.currency = 'SSP'; // South Sudan Pounds
        
        console.log(`MoMo Config initialized for ${this.environment} environment`);
    }

    isValidUUID(str) {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        return uuidRegex.test(str);
    }

    getAuthHeader() {
        return Buffer.from(`${this.apiUserId}:${this.apiKey}`).toString('base64');
    }

    getBaseHeaders() {
        return {
            'Ocp-Apim-Subscription-Key': this.subscriptionKey,
            'Content-Type': 'application/json',
            'X-Target-Environment': this.environment
        };
    }

    maskCredential(value, visibleChars = 4) {
        if (!value) return 'null';
        return value.slice(0, visibleChars) + '*'.repeat(Math.max(0, value.length - visibleChars));
    }

    getDebugInfo() {
        return {
            environment: this.environment,
            baseUrl: this.baseUrl,
            currency: this.currency,
            apiUserId: this.maskCredential(this.apiUserId),
            apiKey: this.maskCredential(this.apiKey),
            subscriptionKey: this.maskCredential(this.subscriptionKey),
            callbackHost: this.callbackHost
        };
    }
}

module.exports = MomoConfig;
