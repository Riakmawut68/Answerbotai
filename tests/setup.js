// Test setup and configuration
const mongoose = require('mongoose');

// Global test timeout
jest.setTimeout(30000);

// Mock environment variables for tests
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://localhost:27017/test-messenger-bot';
process.env.VERIFY_TOKEN = 'test-verify-token';
process.env.PAGE_ACCESS_TOKEN = 'test-page-access-token';
process.env.FB_APP_SECRET = 'test-app-secret';
process.env.OPENAI_API_KEY = 'test-openai-key';
process.env.MOMO_ENVIRONMENT = 'sandbox';
process.env.MOMO_API_USER_ID = 'test-user-id';
process.env.MOMO_API_KEY = 'test-api-key';
process.env.MOMO_SUBSCRIPTION_KEY = 'test-subscription-key';
process.env.CALLBACK_HOST = 'https://test.com';

// Global cleanup after all tests
afterAll(async () => {
    // Close mongoose connections
    if (mongoose.connection.readyState !== 0) {
        await mongoose.connection.close();
    }
});

// Console log filtering for cleaner test output
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeAll(() => {
    console.error = (...args) => {
        // Filter out expected test errors
        const message = args[0];
        if (typeof message === 'string') {
            if (message.includes('MongoServerError') || 
                message.includes('ValidationError') ||
                message.includes('Test error')) {
                return; // Suppress expected test errors
            }
        }
        originalConsoleError(...args);
    };

    console.warn = (...args) => {
        // Filter out expected test warnings
        const message = args[0];
        if (typeof message === 'string') {
            if (message.includes('DeprecationWarning') ||
                message.includes('Test warning')) {
                return; // Suppress expected test warnings
            }
        }
        originalConsoleWarn(...args);
    };
});

afterAll(() => {
    console.error = originalConsoleError;
    console.warn = originalConsoleWarn;
});

// Global test utilities
global.testUtils = {
    // Helper to create test user
    createTestUser: (overrides = {}) => ({
        messengerId: '1234567890123456',
        stage: 'initial',
        hasUsedTrial: false,
        trialMessagesUsedToday: 0,
        dailyMessageCount: 0,
        subscription: { plan: 'none', status: 'none' },
        ...overrides
    }),

    // Helper to create test webhook message
    createWebhookMessage: (senderId, text, type = 'message') => ({
        object: 'page',
        entry: [{
            messaging: [{
                sender: { id: senderId },
                [type]: type === 'message' ? { text } : { payload: text }
            }]
        }]
    }),

    // Helper to wait for async operations
    wait: (ms) => new Promise(resolve => setTimeout(resolve, ms)),

    // Helper to generate unique test IDs
    generateTestId: () => `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
};