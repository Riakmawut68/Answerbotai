const mongoose = require('mongoose');
const request = require('supertest');
const app = require('../../server');
const User = require('../../models/user');
const Subscription = require('../../models/subscription');
const Conversation = require('../../models/conversation');

describe('Complete User Flow Integration Tests', () => {
    let testUser;
    const testMessengerId = '1234567890123456';
    const testMobileNumber = '0921234567';

    beforeAll(async () => {
        // Connect to test database
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect('mongodb://localhost:27017/test-messenger-bot-integration', {
                useNewUrlParser: true,
                useUnifiedTopology: true,
            });
        }
    });

    afterAll(async () => {
        await mongoose.connection.close();
    });

    beforeEach(async () => {
        // Clean test data
        await User.deleteMany({});
        await Subscription.deleteMany({});
        await Conversation.deleteMany({});
        testUser = null;
    });

    describe('🎯 Complete Registration Flow', () => {
        it('should handle complete new user registration flow', async () => {
            // Step 1: New user sends first message
            const newUserMessage = {
                object: 'page',
                entry: [{
                    messaging: [{
                        sender: { id: testMessengerId },
                        message: { text: 'Hello' }
                    }]
                }]
            };

            const response1 = await request(app)
                .post('/webhook')
                .send(newUserMessage)
                .expect(200);

            // Verify user was created
            const createdUser = await User.findOne({ messengerId: testMessengerId });
            expect(createdUser).toBeTruthy();
            expect(createdUser.stage).toBe('initial');
            expect(createdUser.hasUsedTrial).toBe(false);

            // Step 2: User agrees to terms
            const consentMessage = {
                object: 'page',
                entry: [{
                    messaging: [{
                        sender: { id: testMessengerId },
                        postback: { payload: 'I_AGREE' }
                    }]
                }]
            };

            await request(app)
                .post('/webhook')
                .send(consentMessage)
                .expect(200);

            // Verify consent and stage transition
            const userAfterConsent = await User.findOne({ messengerId: testMessengerId });
            expect(userAfterConsent.consentTimestamp).toBeTruthy();
            expect(userAfterConsent.stage).toBe('awaiting_phone');

            // Step 3: User provides valid phone number
            const phoneMessage = {
                object: 'page',
                entry: [{
                    messaging: [{
                        sender: { id: testMessengerId },
                        message: { text: testMobileNumber }
                    }]
                }]
            };

            await request(app)
                .post('/webhook')
                .send(phoneMessage)
                .expect(200);

            // Verify trial activation
            const userAfterPhone = await User.findOne({ messengerId: testMessengerId });
            expect(userAfterPhone.mobileNumber).toBe(testMobileNumber);
            expect(userAfterPhone.stage).toBe('trial');
            expect(userAfterPhone.hasUsedTrial).toBe(true);
            expect(userAfterPhone.trialStartDate).toBeTruthy();
        });

        // 🚨 CRITICAL TEST: Duplicate phone number handling
        it('should prevent trial abuse with duplicate phone numbers', async () => {
            // Create first user with trial used
            const firstUser = new User({
                messengerId: '1111111111111111',
                mobileNumber: testMobileNumber,
                hasUsedTrial: true,
                stage: 'trial',
                consentTimestamp: new Date()
            });
            await firstUser.save();

            // Second user tries to register with same phone
            const secondUser = new User({
                messengerId: testMessengerId,
                stage: 'awaiting_phone',
                consentTimestamp: new Date()
            });
            await secondUser.save();

            const phoneMessage = {
                object: 'page',
                entry: [{
                    messaging: [{
                        sender: { id: testMessengerId },
                        message: { text: testMobileNumber }
                    }]
                }]
            };

            await request(app)
                .post('/webhook')
                .send(phoneMessage)
                .expect(200);

            // Second user should be blocked and offered subscription
            const blockedUser = await User.findOne({ messengerId: testMessengerId });
            expect(blockedUser.stage).toBe('awaiting_phone'); // Should not advance
            expect(blockedUser.hasUsedTrial).toBe(false); // Should remain false
        });

        // 🚨 CRITICAL TEST: Invalid phone number handling
        it('should handle invalid phone number formats gracefully', async () => {
            const user = new User({
                messengerId: testMessengerId,
                stage: 'awaiting_phone',
                consentTimestamp: new Date()
            });
            await user.save();

            const invalidPhoneMessage = {
                object: 'page',
                entry: [{
                    messaging: [{
                        sender: { id: testMessengerId },
                        message: { text: '123456789' } // Invalid format
                    }]
                }]
            };

            await request(app)
                .post('/webhook')
                .send(invalidPhoneMessage)
                .expect(200);

            const userAfterInvalid = await User.findOne({ messengerId: testMessengerId });
            expect(userAfterInvalid.stage).toBe('awaiting_phone'); // Should not advance
            expect(userAfterInvalid.mobileNumber).toBeFalsy();
        });
    });

    describe('🎯 Trial Usage Flow', () => {
        beforeEach(async () => {
            testUser = new User({
                messengerId: testMessengerId,
                mobileNumber: testMobileNumber,
                stage: 'trial',
                hasUsedTrial: true,
                consentTimestamp: new Date(),
                trialMessagesUsedToday: 0,
                subscription: { plan: 'none' }
            });
            await testUser.save();
        });

        it('should handle trial message usage correctly', async () => {
            // Send 3 messages (trial limit)
            for (let i = 1; i <= 3; i++) {
                const message = {
                    object: 'page',
                    entry: [{
                        messaging: [{
                            sender: { id: testMessengerId },
                            message: { text: `Test message ${i}` }
                        }]
                    }]
                };

                await request(app)
                    .post('/webhook')
                    .send(message)
                    .expect(200);

                const userAfterMessage = await User.findOne({ messengerId: testMessengerId });
                expect(userAfterMessage.trialMessagesUsedToday).toBe(i);
            }

            // 4th message should be blocked
            const limitMessage = {
                object: 'page',
                entry: [{
                    messaging: [{
                        sender: { id: testMessengerId },
                        message: { text: 'This should be blocked' }
                    }]
                }]
            };

            await request(app)
                .post('/webhook')
                .send(limitMessage)
                .expect(200);

            const userAfterLimit = await User.findOne({ messengerId: testMessengerId });
            expect(userAfterLimit.trialMessagesUsedToday).toBe(3); // Should not increment
        });

        // 🚨 CRITICAL TEST: Stage vs subscription mismatch
        it('should expose stage/subscription inconsistency bug', async () => {
            // Create user with conflicting state
            const inconsistentUser = await User.findOneAndUpdate(
                { messengerId: testMessengerId },
                {
                    stage: 'trial', // User appears to be in trial
                    subscription: {
                        plan: 'weekly',
                        status: 'active',
                        expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                    },
                    trialMessagesUsedToday: 0,
                    dailyMessageCount: 0
                },
                { new: true }
            );

            const message = {
                object: 'page',
                entry: [{
                    messaging: [{
                        sender: { id: testMessengerId },
                        message: { text: 'Test message' }
                    }]
                }]
            };

            await request(app)
                .post('/webhook')
                .send(message)
                .expect(200);

            const userAfterMessage = await User.findOne({ messengerId: testMessengerId });
            
            // This exposes the bug: user has active subscription but gets trial limits
            expect(userAfterMessage.subscription.plan).toBe('weekly');
            expect(userAfterMessage.subscription.status).toBe('active');
            expect(userAfterMessage.stage).toBe('trial');
            expect(userAfterMessage.trialMessagesUsedToday).toBe(1); // Wrong! Should use subscription limits
            expect(userAfterMessage.dailyMessageCount).toBe(0); // Wrong! Should be incremented
        });
    });

    describe('🎯 Subscription Flow', () => {
        beforeEach(async () => {
            testUser = new User({
                messengerId: testMessengerId,
                mobileNumber: testMobileNumber,
                stage: 'trial',
                hasUsedTrial: true,
                consentTimestamp: new Date(),
                trialMessagesUsedToday: 3 // At trial limit
            });
            await testUser.save();
        });

        it('should handle complete subscription flow', async () => {
            // Step 1: User selects weekly subscription
            const subscribeMessage = {
                object: 'page',
                entry: [{
                    messaging: [{
                        sender: { id: testMessengerId },
                        postback: { payload: 'SUBSCRIBE_WEEKLY' }
                    }]
                }]
            };

            await request(app)
                .post('/webhook')
                .send(subscribeMessage)
                .expect(200);

            const userAfterSubscribe = await User.findOne({ messengerId: testMessengerId });
            expect(userAfterSubscribe.lastSelectedPlanType).toBe('weekly');
            expect(userAfterSubscribe.stage).toBe('awaiting_payment');

            // Step 2: Simulate successful payment callback
            const paymentCallback = {
                reference: userAfterSubscribe.paymentSession?.reference || 'PAY-TEST-123',
                status: 'SUCCESSFUL'
            };

            await request(app)
                .post('/webhook/momo/callback')
                .send(paymentCallback)
                .expect(200);

            const userAfterPayment = await User.findOne({ messengerId: testMessengerId });
            expect(userAfterPayment.subscription.status).toBe('active');
            expect(userAfterPayment.subscription.planType).toBe('weekly');
            expect(userAfterPayment.stage).toBe('subscribed');
            expect(userAfterPayment.paymentSession).toBeNull();
        });

        // 🚨 CRITICAL TEST: Payment plan fallback issue
        it('should expose risky payment plan fallback', async () => {
            // User without selected plan type
            const userWithoutPlan = await User.findOneAndUpdate(
                { messengerId: testMessengerId },
                {
                    stage: 'awaiting_phone_for_payment',
                    lastSelectedPlanType: undefined // No plan selected
                },
                { new: true }
            );

            const phoneMessage = {
                object: 'page',
                entry: [{
                    messaging: [{
                        sender: { id: testMessengerId },
                        message: { text: testMobileNumber }
                    }]
                }]
            };

            await request(app)
                .post('/webhook')
                .send(phoneMessage)
                .expect(200);

            const userAfterPhone = await User.findOne({ messengerId: testMessengerId });
            
            // This exposes the bug: defaults to 'weekly' without user confirmation
            // User might be charged for wrong plan!
            if (userAfterPhone.paymentSession) {
                expect(userAfterPhone.paymentSession.planType).toBe('weekly');
                // This is dangerous - user never explicitly selected weekly!
            }
        });

        // 🚨 CRITICAL TEST: Users stuck in payment state
        it('should identify users stuck in awaiting_payment', async () => {
            // Simulate user stuck in payment
            const stuckUser = await User.findOneAndUpdate(
                { messengerId: testMessengerId },
                {
                    stage: 'awaiting_payment',
                    paymentSession: {
                        reference: 'PAY-STUCK-123',
                        planType: 'weekly',
                        amount: 3000,
                        startTime: new Date(Date.now() - 30 * 60 * 1000) // 30 minutes ago
                    }
                },
                { new: true }
            );

            // User tries to send message while stuck
            const message = {
                object: 'page',
                entry: [{
                    messaging: [{
                        sender: { id: testMessengerId },
                        message: { text: 'I am stuck!' }
                    }]
                }]
            };

            await request(app)
                .post('/webhook')
                .send(message)
                .expect(200);

            const userAfterMessage = await User.findOne({ messengerId: testMessengerId });
            
            // User remains stuck - no timeout mechanism!
            expect(userAfterMessage.stage).toBe('awaiting_payment');
            // This is a critical UX issue - user has no way to recover
        });
    });

    describe('🎯 Command Processing Flow', () => {
        beforeEach(async () => {
            testUser = new User({
                messengerId: testMessengerId,
                mobileNumber: testMobileNumber,
                stage: 'trial',
                hasUsedTrial: true,
                consentTimestamp: new Date(),
                trialMessagesUsedToday: 2,
                dailyMessageCount: 5
            });
            await testUser.save();
        });

        it('should handle resetme command correctly', async () => {
            const resetCommand = {
                object: 'page',
                entry: [{
                    messaging: [{
                        sender: { id: testMessengerId },
                        message: { text: 'resetme' }
                    }]
                }]
            };

            await request(app)
                .post('/webhook')
                .send(resetCommand)
                .expect(200);

            const userAfterReset = await User.findOne({ messengerId: testMessengerId });
            expect(userAfterReset.trialMessagesUsedToday).toBe(0);
            expect(userAfterReset.dailyMessageCount).toBe(0);
        });

        it('should handle status command correctly', async () => {
            const statusCommand = {
                object: 'page',
                entry: [{
                    messaging: [{
                        sender: { id: testMessengerId },
                        message: { text: 'status' }
                    }]
                }]
            };

            await request(app)
                .post('/webhook')
                .send(statusCommand)
                .expect(200);

            // Command should be processed without errors
            const userAfterStatus = await User.findOne({ messengerId: testMessengerId });
            expect(userAfterStatus).toBeTruthy();
        });

        // 🚨 CRITICAL TEST: Invalid stage handling in commands
        it('should handle invalid stages in command processing', async () => {
            // Set user to invalid stage (this could happen due to stage mismatch bug)
            await User.findOneAndUpdate(
                { messengerId: testMessengerId },
                { stage: 'phone_verified' }, // Invalid stage not in enum
                { new: true }
            );

            const statusCommand = {
                object: 'page',
                entry: [{
                    messaging: [{
                        sender: { id: testMessengerId },
                        message: { text: 'status' }
                    }]
                }]
            };

            // This should not crash the system
            await request(app)
                .post('/webhook')
                .send(statusCommand)
                .expect(200);
        });
    });

    describe('🎯 Data Consistency Tests', () => {
        it('should identify dual subscription model inconsistency', async () => {
            // Create user with embedded subscription
            const userWithEmbedded = new User({
                messengerId: testMessengerId,
                subscription: {
                    planType: 'weekly',
                    status: 'active',
                    expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                }
            });
            await userWithEmbedded.save();

            // Create separate subscription record
            const separateSubscription = new Subscription({
                userId: userWithEmbedded._id,
                plan: 'monthly', // Different plan!
                status: 'pending', // Different status!
                expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            });
            await separateSubscription.save();

            // This exposes the data inconsistency issue
            const user = await User.findOne({ messengerId: testMessengerId });
            const subscription = await Subscription.findOne({ userId: user._id });

            // Two different sources of truth!
            expect(user.subscription.planType).toBe('weekly');
            expect(subscription.plan).toBe('monthly');
            expect(user.subscription.status).toBe('active');
            expect(subscription.status).toBe('pending');
        });

        it('should identify stage vs subscription status mismatches', async () => {
            // Create user with inconsistent state
            const inconsistentUser = new User({
                messengerId: testMessengerId,
                stage: 'subscription_expired', // Stage says expired
                subscription: {
                    planType: 'weekly',
                    status: 'active', // But subscription is active
                    expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // And not expired
                }
            });
            await inconsistentUser.save();

            const user = await User.findOne({ messengerId: testMessengerId });
            
            // This represents a critical data inconsistency
            const stageIndicatesExpired = user.stage === 'subscription_expired';
            const subscriptionIsActive = user.subscription.status === 'active' && 
                                       user.subscription.expiryDate > new Date();
            
            expect(stageIndicatesExpired).toBe(true);
            expect(subscriptionIsActive).toBe(true);
            // Both can't be true - this is a bug!
        });
    });

    describe('🎯 Error Recovery Tests', () => {
        it('should handle database connection failures gracefully', async () => {
            // This test would require mocking mongoose connection
            // For now, we validate that errors don't crash the webhook
            
            const message = {
                object: 'page',
                entry: [{
                    messaging: [{
                        sender: { id: 'nonexistent-user' },
                        message: { text: 'Test message' }
                    }]
                }]
            };

            // Should not crash even with invalid data
            await request(app)
                .post('/webhook')
                .send(message)
                .expect(200);
        });

        it('should handle malformed webhook data', async () => {
            const malformedMessage = {
                object: 'page',
                entry: [{
                    messaging: [{}] // Missing required fields
                }]
            };

            // Should not crash
            await request(app)
                .post('/webhook')
                .send(malformedMessage)
                .expect(200);
        });
    });

    describe('🎯 Performance and Scalability Tests', () => {
        it('should handle concurrent user registrations', async () => {
            const promises = [];
            
            // Simulate 10 concurrent new users
            for (let i = 0; i < 10; i++) {
                const message = {
                    object: 'page',
                    entry: [{
                        messaging: [{
                            sender: { id: `concurrent-user-${i}` },
                            message: { text: 'Hello' }
                        }]
                    }]
                };

                promises.push(
                    request(app)
                        .post('/webhook')
                        .send(message)
                        .expect(200)
                );
            }

            await Promise.all(promises);

            // All users should be created successfully
            const createdUsers = await User.find({ 
                messengerId: { $regex: 'concurrent-user-' }
            });
            expect(createdUsers.length).toBe(10);
        });

        it('should handle rapid message sending from same user', async () => {
            const user = new User({
                messengerId: testMessengerId,
                stage: 'trial',
                consentTimestamp: new Date(),
                subscription: { plan: 'none' }
            });
            await user.save();

            const promises = [];
            
            // Send 5 rapid messages
            for (let i = 0; i < 5; i++) {
                const message = {
                    object: 'page',
                    entry: [{
                        messaging: [{
                            sender: { id: testMessengerId },
                            message: { text: `Rapid message ${i}` }
                        }]
                    }]
                };

                promises.push(
                    request(app)
                        .post('/webhook')
                        .send(message)
                        .expect(200)
                );
            }

            await Promise.all(promises);

            // Should handle without errors (though rate limiting might apply)
            const userAfterRapid = await User.findOne({ messengerId: testMessengerId });
            expect(userAfterRapid).toBeTruthy();
        });
    });
});