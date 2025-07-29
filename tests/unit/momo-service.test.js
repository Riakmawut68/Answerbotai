const MomoService = require('../../services/momoService');
const User = require('../../models/user');
const axios = require('axios');

// Mock dependencies
jest.mock('axios');
jest.mock('../../models/user');

describe('MoMo Service Tests', () => {
    let momoService;
    let mockUser;

    beforeEach(() => {
        jest.clearAllMocks();
        
        // Setup environment variables
        process.env.MOMO_ENVIRONMENT = 'sandbox';
        process.env.MOMO_API_USER_ID = 'test-user-id';
        process.env.MOMO_API_KEY = 'test-api-key';
        process.env.MOMO_SUBSCRIPTION_KEY = 'test-subscription-key';
        process.env.CALLBACK_HOST = 'https://test.com';

        momoService = new MomoService();

        mockUser = {
            _id: 'user123',
            messengerId: '1234567890123456',
            mobileNumber: '0921234567',
            paymentSession: null,
            subscription: { plan: 'none' },
            save: jest.fn().mockResolvedValue(true)
        };
    });

    describe('Service Initialization', () => {
        it('should initialize with correct configuration', () => {
            expect(momoService.environment).toBe('sandbox');
            expect(momoService.apiUserId).toBe('test-user-id');
            expect(momoService.apiKey).toBe('test-api-key');
            expect(momoService.subscriptionKey).toBe('test-subscription-key');
        });

        it('should throw error for missing required variables in production', () => {
            delete process.env.MOMO_API_KEY;
            process.env.MOMO_ENVIRONMENT = 'production';

            expect(() => new MomoService()).toThrow('Missing required MoMo variables');
        });

        it('should warn but not throw for missing variables in sandbox', () => {
            delete process.env.MOMO_API_KEY;
            process.env.MOMO_ENVIRONMENT = 'sandbox';

            // Should not throw in sandbox mode
            expect(() => new MomoService()).not.toThrow();
        });
    });

    describe('Payment Initiation', () => {
        it('should successfully initiate weekly payment', async () => {
            axios.post.mockResolvedValue({ status: 200 });

            const result = await momoService.initiatePayment(mockUser, 'weekly');

            expect(result.success).toBe(true);
            expect(result.reference).toBeDefined();
            expect(mockUser.paymentSession).toBeDefined();
            expect(mockUser.paymentSession.planType).toBe('weekly');
            expect(mockUser.paymentSession.amount).toBe(3000);
        });

        it('should successfully initiate monthly payment', async () => {
            axios.post.mockResolvedValue({ status: 200 });

            const result = await momoService.initiatePayment(mockUser, 'monthly');

            expect(result.success).toBe(true);
            expect(mockUser.paymentSession.planType).toBe('monthly');
            expect(mockUser.paymentSession.amount).toBe(6500);
        });

        it('should reject invalid plan type', async () => {
            await expect(momoService.initiatePayment(mockUser, 'invalid')).rejects.toThrow('Invalid plan type');
        });

        it('should handle API errors properly', async () => {
            axios.post.mockRejectedValue(new Error('API Error'));

            await expect(momoService.initiatePayment(mockUser, 'weekly')).rejects.toThrow();
        });

        // 🚨 CRITICAL TEST: Sandbox 401 error handling
        it('should simulate success for sandbox 401 errors', async () => {
            const error = new Error('Unauthorized');
            error.response = { status: 401 };
            axios.post.mockRejectedValue(error);

            const result = await momoService.initiatePayment(mockUser, 'weekly');

            expect(result.success).toBe(true);
            expect(mockUser.paymentSession).toBeDefined();
            // This shows the sandbox simulation logic
        });

        it('should create correct request body', async () => {
            axios.post.mockResolvedValue({ status: 200 });

            await momoService.initiatePayment(mockUser, 'weekly');

            expect(axios.post).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    amount: '3000',
                    currency: 'SSP',
                    payer: {
                        partyIdType: 'MSISDN',
                        partyId: '0921234567'
                    },
                    payerMessage: 'Answer Bot AI weekly subscription',
                    callbackUrl: 'https://test.com/momo/callback'
                }),
                expect.any(Object)
            );
        });

        it('should include correct headers', async () => {
            axios.post.mockResolvedValue({ status: 200 });

            await momoService.initiatePayment(mockUser, 'weekly');

            const [, , config] = axios.post.mock.calls[0];
            expect(config.headers).toEqual(expect.objectContaining({
                'Authorization': 'Bearer test-api-key',
                'X-Target-Environment': 'sandbox',
                'Ocp-Apim-Subscription-Key': 'test-subscription-key',
                'Content-Type': 'application/json'
            }));
        });
    });

    describe('Payment Status Checking', () => {
        it('should check payment status successfully', async () => {
            const mockResponse = {
                data: { status: 'SUCCESSFUL', amount: '3000' }
            };
            axios.get.mockResolvedValue(mockResponse);

            const result = await momoService.checkPaymentStatus('PAY-123456');

            expect(result).toEqual(mockResponse.data);
            expect(axios.get).toHaveBeenCalledWith(
                expect.stringContaining('PAY-123456'),
                expect.any(Object)
            );
        });

        it('should handle status check errors', async () => {
            axios.get.mockRejectedValue(new Error('Network error'));

            await expect(momoService.checkPaymentStatus('PAY-123456')).rejects.toThrow();
        });
    });

    describe('Payment Verification', () => {
        it('should verify successful payment', async () => {
            axios.get.mockResolvedValue({
                data: { status: 'SUCCESSFUL' }
            });

            const result = await momoService.verifyPayment('PAY-123456');

            expect(result.success).toBe(true);
            expect(result.status).toBe('SUCCESSFUL');
        });

        it('should handle failed payment', async () => {
            axios.get.mockResolvedValue({
                data: { status: 'FAILED' }
            });

            const result = await momoService.verifyPayment('PAY-123456');

            expect(result.success).toBe(false);
            expect(result.status).toBe('FAILED');
        });

        it('should handle pending payment', async () => {
            axios.get.mockResolvedValue({
                data: { status: 'PENDING' }
            });

            const result = await momoService.verifyPayment('PAY-123456');

            expect(result.success).toBe(false);
            expect(result.status).toBe('PENDING');
            expect(result.pending).toBe(true);
        });
    });

    describe('Payment Callback Handling', () => {
        beforeEach(() => {
            mockUser.paymentSession = {
                reference: 'PAY-123456',
                planType: 'weekly',
                amount: 3000
            };
            User.findOne.mockResolvedValue(mockUser);
        });

        it('should handle successful payment callback', async () => {
            const callbackData = {
                reference: 'PAY-123456',
                status: 'SUCCESSFUL'
            };

            const result = await momoService.handlePaymentCallback(callbackData);

            expect(result.success).toBe(true);
            expect(mockUser.subscription.status).toBe('active');
            expect(mockUser.subscription.planType).toBe('weekly');
            expect(mockUser.stage).toBe('subscribed');
            expect(mockUser.paymentSession).toBeNull();
        });

        it('should handle failed payment callback', async () => {
            const callbackData = {
                reference: 'PAY-123456',
                status: 'FAILED'
            };

            const result = await momoService.handlePaymentCallback(callbackData);

            expect(result.success).toBe(true);
            expect(mockUser.stage).toBe('payment_failed');
            expect(mockUser.paymentSession).toBeNull();
        });

        it('should reject invalid callback data', async () => {
            const callbackData = {
                reference: null, // Invalid
                status: 'SUCCESSFUL'
            };

            await expect(momoService.handlePaymentCallback(callbackData)).rejects.toThrow('Invalid callback data');
        });

        it('should handle user not found scenario', async () => {
            User.findOne.mockResolvedValue(null);

            const callbackData = {
                reference: 'PAY-123456',
                status: 'SUCCESSFUL'
            };

            await expect(momoService.handlePaymentCallback(callbackData)).rejects.toThrow('User not found');
        });

        // 🚨 CRITICAL TEST: Subscription expiry calculation
        it('should calculate correct expiry dates', async () => {
            const callbackData = {
                reference: 'PAY-123456',
                status: 'SUCCESSFUL'
            };

            const beforeTest = new Date();
            await momoService.handlePaymentCallback(callbackData);
            const afterTest = new Date();

            expect(mockUser.subscription.expiryDate).toBeDefined();
            
            // For weekly plan, should be 7 days from now
            const expectedExpiry = new Date();
            expectedExpiry.setDate(expectedExpiry.getDate() + 7);
            
            const actualExpiry = mockUser.subscription.expiryDate;
            const timeDiff = Math.abs(actualExpiry - expectedExpiry);
            
            // Should be within 1 minute of expected time
            expect(timeDiff).toBeLessThan(60000);
        });

        it('should handle monthly subscription expiry', async () => {
            mockUser.paymentSession.planType = 'monthly';
            
            const callbackData = {
                reference: 'PAY-123456',
                status: 'SUCCESSFUL'
            };

            await momoService.handlePaymentCallback(callbackData);

            // For monthly plan, should be 30 days from now
            const expectedExpiry = new Date();
            expectedExpiry.setDate(expectedExpiry.getDate() + 30);
            
            const actualExpiry = mockUser.subscription.expiryDate;
            const timeDiff = Math.abs(actualExpiry - expectedExpiry);
            
            // Should be within 1 minute of expected time
            expect(timeDiff).toBeLessThan(60000);
        });
    });

    describe('Helper Methods', () => {
        it('should calculate plan amounts correctly', () => {
            expect(momoService.calculatePlanAmount('weekly')).toBe(3000);
            expect(momoService.calculatePlanAmount('monthly')).toBe(6500);
        });

        it('should throw error for invalid plan amount calculation', () => {
            expect(() => momoService.calculatePlanAmount('invalid')).toThrow('Invalid plan type');
        });

        it('should build correct request body', () => {
            const body = momoService.buildRequestBody(mockUser, 'weekly', 3000);

            expect(body).toEqual({
                amount: '3000',
                currency: 'SSP',
                externalId: expect.any(String),
                payer: {
                    partyIdType: 'MSISDN',
                    partyId: '0921234567'
                },
                payerMessage: 'Answer Bot AI weekly subscription',
                payeeNote: 'weekly plan for 1234567890123456',
                callbackUrl: 'https://test.com/momo/callback'
            });
        });

        it('should generate correct request headers', () => {
            const headers = momoService.getRequestHeaders('PAY-123456');

            expect(headers).toEqual({
                'Authorization': 'Bearer test-api-key',
                'X-Reference-Id': 'PAY-123456',
                'X-Target-Environment': 'sandbox',
                'Ocp-Apim-Subscription-Key': 'test-subscription-key',
                'Content-Type': 'application/json',
                'X-Callback-Url': 'https://test.com/momo/callback'
            });
        });

        it('should mask sensitive strings correctly', () => {
            expect(momoService.maskString('12345678', 4)).toBe('1234****');
            expect(momoService.maskString('abc', 2)).toBe('ab*');
            expect(momoService.maskString(null)).toBe('null');
        });
    });

    describe('Error Scenarios', () => {
        it('should handle network timeouts', async () => {
            const timeoutError = new Error('Request timeout');
            timeoutError.code = 'ECONNABORTED';
            axios.post.mockRejectedValue(timeoutError);

            await expect(momoService.initiatePayment(mockUser, 'weekly')).rejects.toThrow();
        });

        it('should handle API rate limiting', async () => {
            const rateLimitError = new Error('Rate limited');
            rateLimitError.response = { status: 429 };
            axios.post.mockRejectedValue(rateLimitError);

            await expect(momoService.initiatePayment(mockUser, 'weekly')).rejects.toThrow();
        });

        it('should handle malformed API responses', async () => {
            axios.get.mockResolvedValue({ data: null });

            const result = await momoService.checkPaymentStatus('PAY-123456');
            expect(result).toBeNull();
        });

        // 🚨 CRITICAL TEST: Database save failures during callback
        it('should handle database save failures during callback', async () => {
            mockUser.save.mockRejectedValue(new Error('Database error'));
            
            const callbackData = {
                reference: 'PAY-123456',
                status: 'SUCCESSFUL'
            };

            await expect(momoService.handlePaymentCallback(callbackData)).rejects.toThrow('Database error');
        });
    });

    describe('Environment-Specific Behavior', () => {
        it('should use different base URLs for environments', () => {
            process.env.MOMO_ENVIRONMENT = 'production';
            const prodService = new MomoService();
            expect(prodService.baseUrl).toBe('https://api.momoapi.mtn.com');

            process.env.MOMO_ENVIRONMENT = 'sandbox';
            const sandboxService = new MomoService();
            expect(sandboxService.baseUrl).toBe('https://sandbox.momodeveloper.mtn.com');
        });

        it('should handle custom base URL from environment', () => {
            process.env.MOMO_BASE_URL = 'https://custom.api.com';
            const customService = new MomoService();
            expect(customService.baseUrl).toBe('https://custom.api.com');
        });
    });
});