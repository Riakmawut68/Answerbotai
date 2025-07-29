const webhookController = require('../../controllers/webhookController');
const User = require('../../models/user');
const messengerService = require('../../services/messengerService');
const momoService = require('../../services/momoService');
const commandService = require('../../services/commandService');

// Mock all external services
jest.mock('../../services/messengerService');
jest.mock('../../services/momoService');
jest.mock('../../services/commandService');
jest.mock('../../models/user');

describe('Webhook Controller Tests', () => {
    let mockUser;
    let mockRequest;
    let mockResponse;

    beforeEach(() => {
        // Reset mocks
        jest.clearAllMocks();

        // Mock user object
        mockUser = {
            _id: 'user123',
            messengerId: '1234567890123456',
            stage: 'initial',
            mobileNumber: null,
            hasUsedTrial: false,
            trialMessagesUsedToday: 0,
            dailyMessageCount: 0,
            subscription: { plan: 'none', status: 'none' },
            save: jest.fn().mockResolvedValue(true),
            consentTimestamp: null
        };

        // Mock request/response
        mockRequest = {
            query: {},
            body: {},
        };

        mockResponse = {
            status: jest.fn().mockReturnThis(),
            send: jest.fn().mockReturnThis(),
            sendStatus: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
        };

        // Mock services
        messengerService.sendText.mockResolvedValue(true);
        messengerService.sendButtonTemplate.mockResolvedValue(true);
        messengerService.sendWelcomeMessage.mockResolvedValue(true);
    });

    describe('Webhook Verification', () => {
        it('should verify webhook with correct token', () => {
            process.env.VERIFY_TOKEN = 'test_token';
            mockRequest.query = {
                'hub.mode': 'subscribe',
                'hub.verify_token': 'test_token',
                'hub.challenge': 'challenge_value'
            };

            webhookController.verify(mockRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.send).toHaveBeenCalledWith('challenge_value');
        });

        it('should reject webhook with incorrect token', () => {
            process.env.VERIFY_TOKEN = 'correct_token';
            mockRequest.query = {
                'hub.mode': 'subscribe',
                'hub.verify_token': 'wrong_token',
                'hub.challenge': 'challenge_value'
            };

            webhookController.verify(mockRequest, mockResponse);

            expect(mockResponse.sendStatus).toHaveBeenCalledWith(403);
        });
    });

    describe('Message Processing', () => {
        beforeEach(() => {
            mockRequest.body = {
                object: 'page',
                entry: [{
                    messaging: [{
                        sender: { id: '1234567890123456' },
                        message: { text: 'Hello' }
                    }]
                }]
            };
        });

        it('should create new user for first-time messenger', async () => {
            User.findOne.mockResolvedValue(null);
            User.mockImplementation(() => mockUser);

            await webhookController.handleEvent(mockRequest, mockResponse);

            expect(User.findOne).toHaveBeenCalledWith({ messengerId: '1234567890123456' });
            expect(messengerService.sendWelcomeMessage).toHaveBeenCalledWith('1234567890123456');
            expect(mockResponse.status).toHaveBeenCalledWith(200);
        });

        it('should process message for existing user with consent', async () => {
            mockUser.consentTimestamp = new Date();
            mockUser.stage = 'trial';
            User.findOne.mockResolvedValue(mockUser);
            commandService.processCommand.mockResolvedValue({ isCommand: false });

            await webhookController.handleEvent(mockRequest, mockResponse);

            expect(commandService.processCommand).toHaveBeenCalled();
            expect(mockUser.save).toHaveBeenCalled();
        });

        it('should ignore message for user without consent', async () => {
            mockUser.consentTimestamp = null;
            User.findOne.mockResolvedValue(mockUser);

            await webhookController.handleEvent(mockRequest, mockResponse);

            expect(messengerService.sendText).not.toHaveBeenCalled();
            expect(mockResponse.status).toHaveBeenCalledWith(200);
        });

        // 🚨 CRITICAL TEST: Stage validation during message processing
        it('should handle invalid stage gracefully', async () => {
            mockUser.consentTimestamp = new Date();
            mockUser.stage = 'invalid_stage'; // This would cause validation error
            User.findOne.mockResolvedValue(mockUser);
            commandService.processCommand.mockResolvedValue({ isCommand: false });

            await webhookController.handleEvent(mockRequest, mockResponse);

            // Should not crash and should respond OK
            expect(mockResponse.status).toHaveBeenCalledWith(200);
        });
    });

    describe('Stage Transitions', () => {
        beforeEach(() => {
            User.findOne.mockResolvedValue(mockUser);
            commandService.processCommand.mockResolvedValue({ isCommand: false });
        });

        describe('Phone Number Collection', () => {
            it('should validate and save valid phone number', async () => {
                mockUser.consentTimestamp = new Date();
                mockUser.stage = 'awaiting_phone';
                
                mockRequest.body.entry[0].messaging[0].message.text = '0921234567';

                await webhookController.handleEvent(mockRequest, mockResponse);

                expect(mockUser.mobileNumber).toBe('0921234567');
                expect(mockUser.stage).toBe('trial');
                expect(mockUser.hasUsedTrial).toBe(true);
            });

            it('should reject invalid phone number format', async () => {
                mockUser.consentTimestamp = new Date();
                mockUser.stage = 'awaiting_phone';
                
                mockRequest.body.entry[0].messaging[0].message.text = '123456789';

                await webhookController.handleEvent(mockRequest, mockResponse);

                expect(messengerService.sendText).toHaveBeenCalledWith(
                    expect.any(String),
                    expect.stringContaining('valid MTN South Sudan number')
                );
            });

            // 🚨 CRITICAL TEST: Duplicate phone number handling
            it('should handle duplicate phone number correctly', async () => {
                mockUser.consentTimestamp = new Date();
                mockUser.stage = 'awaiting_phone';
                
                // Mock existing user with same phone number
                const existingUser = { hasUsedTrial: true };
                User.findOne
                    .mockResolvedValueOnce(mockUser) // First call for current user
                    .mockResolvedValueOnce(existingUser); // Second call for phone check

                mockRequest.body.entry[0].messaging[0].message.text = '0921234567';

                await webhookController.handleEvent(mockRequest, mockResponse);

                expect(messengerService.sendText).toHaveBeenCalledWith(
                    expect.any(String),
                    expect.stringContaining('already been used for a free trial')
                );
                expect(messengerService.sendButtonTemplate).toHaveBeenCalled();
            });
        });

        describe('Payment Flow', () => {
            it('should initiate payment for valid phone number', async () => {
                mockUser.consentTimestamp = new Date();
                mockUser.stage = 'awaiting_phone_for_payment';
                mockUser.lastSelectedPlanType = 'weekly';
                
                const mockMomoService = {
                    initiatePayment: jest.fn().mockResolvedValue({ success: true })
                };
                momoService.initiatePayment = mockMomoService.initiatePayment;

                mockRequest.body.entry[0].messaging[0].message.text = '0921234567';

                await webhookController.handleEvent(mockRequest, mockResponse);

                expect(mockMomoService.initiatePayment).toHaveBeenCalledWith(mockUser, 'weekly');
                expect(mockUser.stage).toBe('awaiting_payment');
            });

            // 🚨 CRITICAL TEST: Payment plan fallback issue
            it('should expose fallback to weekly plan issue', async () => {
                mockUser.consentTimestamp = new Date();
                mockUser.stage = 'awaiting_phone_for_payment';
                mockUser.lastSelectedPlanType = undefined; // No plan selected
                
                const mockMomoService = {
                    initiatePayment: jest.fn().mockResolvedValue({ success: true })
                };
                momoService.initiatePayment = mockMomoService.initiatePayment;

                mockRequest.body.entry[0].messaging[0].message.text = '0921234567';

                await webhookController.handleEvent(mockRequest, mockResponse);

                // This exposes the risky fallback to 'weekly'
                expect(mockMomoService.initiatePayment).toHaveBeenCalledWith(mockUser, 'weekly');
                // User might be charged for wrong plan!
            });

            it('should handle payment initiation failure', async () => {
                mockUser.consentTimestamp = new Date();
                mockUser.stage = 'awaiting_phone_for_payment';
                
                const mockMomoService = {
                    initiatePayment: jest.fn().mockRejectedValue(new Error('Payment failed'))
                };
                momoService.initiatePayment = mockMomoService.initiatePayment;

                mockRequest.body.entry[0].messaging[0].message.text = '0921234567';

                await webhookController.handleEvent(mockRequest, mockResponse);

                expect(messengerService.sendText).toHaveBeenCalledWith(
                    expect.any(String),
                    expect.stringContaining('error processing your payment')
                );
            });

            // 🚨 CRITICAL TEST: Users stuck in awaiting_payment
            it('should handle users stuck in awaiting_payment stage', async () => {
                mockUser.consentTimestamp = new Date();
                mockUser.stage = 'awaiting_payment';
                
                mockRequest.body.entry[0].messaging[0].message.text = 'Hello';

                await webhookController.handleEvent(mockRequest, mockResponse);

                expect(messengerService.sendText).toHaveBeenCalledWith(
                    expect.any(String),
                    'Please complete your payment to continue.'
                );
                // No mechanism to timeout or reset this state!
            });
        });

        describe('Message Limits', () => {
            it('should enforce trial message limits', async () => {
                mockUser.consentTimestamp = new Date();
                mockUser.stage = 'trial';
                mockUser.trialMessagesUsedToday = 3; // At limit
                mockUser.subscription = { plan: 'none' };

                mockRequest.body.entry[0].messaging[0].message.text = 'Hello';

                await webhookController.handleEvent(mockRequest, mockResponse);

                expect(messengerService.sendText).toHaveBeenCalledWith(
                    expect.any(String),
                    expect.stringContaining('reached your daily free trial limit')
                );
            });

            // 🚨 CRITICAL TEST: Stage vs subscription mismatch
            it('should expose stage/subscription inconsistency', async () => {
                mockUser.consentTimestamp = new Date();
                mockUser.stage = 'trial'; // User thinks they're in trial
                mockUser.subscription = { plan: 'weekly', status: 'active' }; // But has active subscription
                mockUser.trialMessagesUsedToday = 0;
                mockUser.dailyMessageCount = 0;

                mockRequest.body.entry[0].messaging[0].message.text = 'Hello';

                await webhookController.handleEvent(mockRequest, mockResponse);

                // Which limit will be applied? This exposes the inconsistency
                expect(mockUser.trialMessagesUsedToday).toBe(1); // Trial limit applied
                expect(mockUser.dailyMessageCount).toBe(0); // Subscription limit not applied
                // This is wrong! User has active subscription but gets trial limits
            });
        });
    });

    describe('Postback Handling', () => {
        beforeEach(() => {
            mockRequest.body = {
                object: 'page',
                entry: [{
                    messaging: [{
                        sender: { id: '1234567890123456' },
                        postback: { payload: 'I_AGREE' }
                    }]
                }]
            };
            User.findOne.mockResolvedValue(mockUser);
        });

        it('should handle consent agreement', async () => {
            await webhookController.handleEvent(mockRequest, mockResponse);

            expect(mockUser.consentTimestamp).toBeDefined();
            expect(mockUser.stage).toBe('awaiting_phone');
            expect(messengerService.sendText).toHaveBeenCalledWith(
                expect.any(String),
                expect.stringContaining('enter your own MTN mobile number')
            );
        });

        it('should handle subscription selection', async () => {
            mockRequest.body.entry[0].messaging[0].postback.payload = 'SUBSCRIBE_WEEKLY';
            mockUser.mobileNumber = '0921234567';

            const mockMomoService = {
                initiatePayment: jest.fn().mockResolvedValue({ success: true })
            };
            momoService.initiatePayment = mockMomoService.initiatePayment;

            await webhookController.handleEvent(mockRequest, mockResponse);

            expect(mockUser.lastSelectedPlanType).toBe('weekly');
            expect(mockMomoService.initiatePayment).toHaveBeenCalledWith(mockUser, 'weekly');
        });

        it('should request phone number for subscription without mobile', async () => {
            mockRequest.body.entry[0].messaging[0].postback.payload = 'SUBSCRIBE_WEEKLY';
            mockUser.mobileNumber = null;

            await webhookController.handleEvent(mockRequest, mockResponse);

            expect(mockUser.lastSelectedPlanType).toBe('weekly');
            expect(mockUser.stage).toBe('awaiting_phone_for_payment');
            expect(messengerService.sendText).toHaveBeenCalledWith(
                expect.any(String),
                expect.stringContaining('enter your MTN mobile number')
            );
        });
    });

    describe('Payment Callback Handling', () => {
        it('should handle successful payment callback', async () => {
            const callbackData = {
                reference: 'PAY-123456',
                status: 'SUCCESSFUL'
            };

            mockRequest.body = callbackData;
            
            const mockMomoServiceInstance = {
                handlePaymentCallback: jest.fn().mockResolvedValue({ success: true })
            };
            
            // Mock the service method
            const originalMomoService = require('../../services/momoService');
            originalMomoService.handlePaymentCallback = mockMomoServiceInstance.handlePaymentCallback;

            User.findOne.mockResolvedValue({
                messengerId: '1234567890123456',
                paymentSession: { reference: 'PAY-123456' }
            });

            await webhookController.handlePaymentCallback(mockRequest, mockResponse);

            expect(mockMomoServiceInstance.handlePaymentCallback).toHaveBeenCalledWith(callbackData);
            expect(mockResponse.status).toHaveBeenCalledWith(200);
        });

        it('should handle failed payment callback', async () => {
            const callbackData = {
                reference: 'PAY-123456',
                status: 'FAILED'
            };

            mockRequest.body = callbackData;
            
            const mockMomoServiceInstance = {
                handlePaymentCallback: jest.fn().mockResolvedValue({ success: true })
            };
            
            const originalMomoService = require('../../services/momoService');
            originalMomoService.handlePaymentCallback = mockMomoServiceInstance.handlePaymentCallback;

            User.findOne.mockResolvedValue({
                messengerId: '1234567890123456',
                paymentSession: { reference: 'PAY-123456' }
            });

            await webhookController.handlePaymentCallback(mockRequest, mockResponse);

            expect(mockMomoServiceInstance.handlePaymentCallback).toHaveBeenCalledWith(callbackData);
            expect(mockResponse.status).toHaveBeenCalledWith(200);
        });
    });

    describe('Error Handling', () => {
        it('should handle database errors gracefully', async () => {
            User.findOne.mockRejectedValue(new Error('Database error'));

            await webhookController.handleEvent(mockRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            // Should still respond OK to Facebook even with errors
        });

        it('should handle messenger service errors', async () => {
            mockUser.consentTimestamp = new Date();
            mockUser.stage = 'trial';
            User.findOne.mockResolvedValue(mockUser);
            commandService.processCommand.mockResolvedValue({ isCommand: false });
            messengerService.sendText.mockRejectedValue(new Error('Messenger error'));

            await webhookController.handleEvent(mockRequest, mockResponse);

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            // Should handle errors without crashing
        });
    });
});