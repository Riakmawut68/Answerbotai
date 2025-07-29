require('dotenv').config();

const config = {
    // Server Configuration
    server: {
        port: process.env.PORT || 3000,
    },
    
    // App Configuration
    app: {
        environment: process.env.NODE_ENV || 'development',
        version: '1.0.0',
    },
    
    // Database
    database: {
        uri: process.env.MONGODB_URI,
        options: {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        }
    },
    
    // Facebook Configuration
    facebook: {
        verifyToken: process.env.VERIFY_TOKEN,
        pageAccessToken: process.env.PAGE_ACCESS_TOKEN,
        appSecret: process.env.FB_APP_SECRET,
    },
    
    // AI Configuration
    ai: {
        apiKey: process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY,
        model: process.env.AI_MODEL || 'mistralai/mistral-nemo:free',
        systemPrompt: process.env.SYSTEM_PROMPT || 'You are a helpful AI assistant focusing on academics, business, agriculture, health, and general knowledge. Provide accurate, concise responses.',
        maxTokens: parseInt(process.env.MAX_TOKENS) || 800,
    },
    
    // MTN MoMo Configuration
    momo: {
        apiUserId: process.env.MOMO_API_USER_ID,
        apiKey: process.env.MOMO_API_KEY,
        subscriptionKey: process.env.MOMO_SUBSCRIPTION_KEY,
        baseUrl: process.env.MOMO_BASE_URL,
        callbackHost: process.env.CALLBACK_HOST,
        externalId: process.env.MOMO_EXTERNAL_ID,
        environment: process.env.MOMO_ENVIRONMENT || 'sandbox',
    },
    
    // Service Configuration
    service: {
        url: process.env.SELF_URL || 'https://answerbotai.onrender.com',
        selfUrl: process.env.SELF_URL,
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
        level: process.env.LOG_LEVEL || 'info',
        file: {
            error: './logs/error.log',
            combined: './logs/combined.log'
        }
    }
};

// Validate required configuration
const requiredFields = [
    'database.uri',
    'facebook.verifyToken',
    'facebook.pageAccessToken',
    'facebook.appSecret',
    'ai.apiKey'
];

requiredFields.forEach(field => {
    const value = field.split('.').reduce((obj, key) => obj?.[key], config);
    if (!value) {
        throw new Error(`Missing required configuration: ${field}`);
    }
});

module.exports = config; 