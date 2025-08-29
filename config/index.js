require('dotenv').config();
const Joi = require('joi');

// Environment validation schema
const envVarsSchema = Joi.object({
    // Server & Database
    PORT: Joi.number().default(3000),
    MONGODB_URI: Joi.string().required(),
    NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
    
    // Facebook Configuration
    VERIFY_TOKEN: Joi.string().required(),
    PAGE_ACCESS_TOKEN: Joi.string().required(),
    FB_APP_SECRET: Joi.string().required(),
    
    // AI Configuration
    OPENROUTER_API_KEY: Joi.string().optional(),
    OPENAI_API_KEY: Joi.string().optional(),
    AI_MODEL: Joi.string().default('mistralai/mistral-nemo:free'),
    SYSTEM_PROMPT: Joi.string().default('You are a helpful AI assistant focusing on academics, business, agriculture, health, and general knowledge. Provide accurate, concise responses.'),
    MAX_TOKENS: Joi.number().default(800),
    
    // MTN MoMo Configuration
    MOMO_API_USER_ID: Joi.string().uuid().required(),
    // Accept either UUID-with-dashes or 32-hex (some portals issue 32-hex keys)
    MOMO_API_KEY: Joi.alternatives().try(Joi.string().uuid(), Joi.string().pattern(/^[0-9a-f]{32}$/i)).required(),
    MOMO_SUBSCRIPTION_KEY: Joi.alternatives().try(Joi.string().uuid(), Joi.string().pattern(/^[0-9a-f]{32}$/i)).required(),
    MOMO_BASE_URL: Joi.string().uri().default('https://sandbox.momodeveloper.mtn.com'),
    CALLBACK_HOST: Joi.string().uri().required(),
    MOMO_EXTERNAL_ID: Joi.string().optional(),
    MOMO_ENVIRONMENT: Joi.string().valid('sandbox', 'production').default('sandbox'),
    
    // App Configuration
    SELF_URL: Joi.string().uri().default('https://answerbotai.onrender.com'),
    ENCRYPTION_KEY: Joi.string().optional(),
    LOG_LEVEL: Joi.string().valid('error', 'warn', 'info', 'debug').default('info'),

    // Per-user hourly rate limits (sliding window)
    PER_USER_LIMITS_ENABLED: Joi.boolean().default(true),
    GENERAL_GRAPH_PER_HOUR: Joi.number().default(30),
    RATE_WINDOW_MS: Joi.number().default(60 * 60 * 1000),
    FREEMIUM_AI_PER_HOUR: Joi.number().default(3),
    FREEMIUM_GRAPH_PER_HOUR: Joi.number().default(10),
    PREMIUM_AI_PER_HOUR: Joi.number().default(20),
    PREMIUM_GRAPH_PER_HOUR: Joi.number().default(30),
    RATE_LIMIT_NOTICE_COOLDOWN_MS: Joi.number().default(10 * 60 * 1000),
}).unknown().required();

// Validate environment variables
const { error, value: envVars } = envVarsSchema.validate(process.env);

if (error) {
    throw new Error(`[CONFIG ERROR] ${error.message}`);
}

// Ensure at least one AI API key is provided
if (!envVars.OPENROUTER_API_KEY && !envVars.OPENAI_API_KEY) {
    throw new Error('[CONFIG ERROR] Either OPENROUTER_API_KEY or OPENAI_API_KEY must be provided');
}

const config = {
    // Server Configuration
    server: {
        port: envVars.PORT,
    },
    
    // App Configuration
    app: {
        environment: envVars.NODE_ENV,
        version: '1.0.0',
    },

    // Per-user hourly limits
    perUserLimits: {
        enabled: envVars.PER_USER_LIMITS_ENABLED,
        windowMs: envVars.RATE_WINDOW_MS,
        generalGraphPerHour: envVars.GENERAL_GRAPH_PER_HOUR,
        noticeCooldownMs: envVars.RATE_LIMIT_NOTICE_COOLDOWN_MS,
    },
    
    // Sandbox Bypass Configuration (for testing only)
    sandbox: {
        enableBypass: envVars.NODE_ENV === 'development',
        testPhoneNumbers: ['0921234567', '0927654321'], // Add your test numbers here
        adminNotification: true
    },
    
    // Database
    database: {
        uri: envVars.MONGODB_URI,
        options: {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        }
    },
    
    // Facebook Configuration
    facebook: {
        verifyToken: envVars.VERIFY_TOKEN,
        pageAccessToken: envVars.PAGE_ACCESS_TOKEN,
        appSecret: envVars.FB_APP_SECRET,
    },
    
    // AI Configuration
    ai: {
        apiKey: envVars.OPENROUTER_API_KEY || envVars.OPENAI_API_KEY,
        model: envVars.AI_MODEL,
        systemPrompt: envVars.SYSTEM_PROMPT,
        maxTokens: envVars.MAX_TOKENS,
    },
    
    // MTN MoMo Configuration
    momo: {
        apiUserId: envVars.MOMO_API_USER_ID,
        apiKey: envVars.MOMO_API_KEY,
        subscriptionKey: envVars.MOMO_SUBSCRIPTION_KEY,
        baseUrl: envVars.MOMO_BASE_URL,
        callbackHost: envVars.CALLBACK_HOST,
        externalId: envVars.MOMO_EXTERNAL_ID,
        environment: envVars.MOMO_ENVIRONMENT,
        
        // Smart Currency & Amount Configuration
        // Frontend always shows SSP prices, backend converts based on environment
        displayCurrency: 'SSP', // What users see in frontend
        displayAmounts: {
            weekly: 3000,   // Always show 3,000 SSP
            monthly: 6500   // Always show 6,500 SSP
        },
        
        // Backend payment amounts (converted based on environment)
        getPaymentCurrency() {
            return this.environment === 'sandbox' ? 'EUR' : 'SSP';
        },
        
        getPaymentAmount(planType) {
            if (this.environment === 'sandbox') {
                // Sandbox: Convert SSP to EUR for testing
                const sspAmount = this.displayAmounts[planType];
                return sspAmount === 3000 ? 1 : 2; // 3000 SSP → 1 EUR, 6500 SSP → 2 EUR
            } else {
                // Production: Use actual SSP amounts
                return this.displayAmounts[planType];
            }
        },
        
        // Test phone number for sandbox
        getTestPhoneNumber() {
            return this.environment === 'sandbox' ? '256770000000' : null;
        }
    },
    
    // Service Configuration
    service: {
        url: envVars.SELF_URL,
        selfUrl: envVars.SELF_URL,
        name: 'Answer Bot AI',
        pingInterval: 50, // seconds
        pingTimeout: 10000, // milliseconds
    },
    
    // Rate Limiting
    rateLimit: {
        windowMs: 10 * 60 * 1000, // 10 minutes
        max: 60, // limit each IP to 60 requests per windowMs
        message: 'Too many requests from this IP, please try again later.',
    },
    
    // Timezone (Juba, South Sudan)
    timezone: 'Africa/Juba',
    
    // Usage Limits
    limits: {
        trialMessagesPerDay: 3,
        subscriptionMessagesPerDay: 30,
        subscriptionPlans: {
            weekly: { price: 3000, duration: 7 },
            monthly: { price: 6500, duration: 30 }
        }
    },
    
    // Validation
    validation: {
        mobileNumberRegex: /^092\d{7}$/,
        maxMessageLength: 1000,
    },
    
    // Logging
    logging: {
        level: envVars.LOG_LEVEL,
        file: {
            error: './logs/error.log',
            combined: './logs/combined.log'
        }
    }
};

module.exports = config; 