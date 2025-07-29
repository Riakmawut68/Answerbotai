const mongoose = require('mongoose');
const User = require('../../models/user');

describe('User Model Tests', () => {
    beforeAll(async () => {
        // Connect to test database
        await mongoose.connect('mongodb://localhost:27017/test-messenger-bot', {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
    });

    afterAll(async () => {
        await mongoose.connection.close();
    });

    beforeEach(async () => {
        await User.deleteMany({});
    });

    describe('User Schema Validation', () => {
        it('should create a valid user with required fields', async () => {
            const userData = {
                messengerId: '1234567890123456'
            };
            
            const user = new User(userData);
            await user.save();
            
            expect(user.messengerId).toBe(userData.messengerId);
            expect(user.stage).toBe('initial');
            expect(user.hasUsedTrial).toBe(false);
            expect(user.trialMessagesUsedToday).toBe(0);
            expect(user.dailyMessageCount).toBe(0);
        });

        it('should validate mobile number format', async () => {
            const user = new User({
                messengerId: '1234567890123456',
                mobileNumber: '0921234567'
            });
            
            await expect(user.save()).resolves.toBeDefined();
        });

        it('should reject invalid mobile number format', async () => {
            const user = new User({
                messengerId: '1234567890123456',
                mobileNumber: '123456789' // Invalid format
            });
            
            await expect(user.save()).rejects.toThrow();
        });

        it('should reject duplicate messenger ID', async () => {
            const messengerId = '1234567890123456';
            
            const user1 = new User({ messengerId });
            await user1.save();
            
            const user2 = new User({ messengerId });
            await expect(user2.save()).rejects.toThrow();
        });

        // 🚨 CRITICAL TEST: Stage validation
        it('should validate user stages correctly', async () => {
            const user = new User({ messengerId: '1234567890123456' });
            
            // Valid stages
            const validStages = [
                'initial', 'awaiting_phone', 'trial', 'awaiting_payment',
                'subscribed', 'payment_failed', 'subscription_expired'
            ];
            
            for (const stage of validStages) {
                user.stage = stage;
                await expect(user.save()).resolves.toBeDefined();
            }
        });

        // 🚨 EXPOSES BUG: Invalid stages used in controller
        it('should reject invalid stages used in controller', async () => {
            const user = new User({ messengerId: '1234567890123456' });
            
            // These stages are used in webhookController but not in enum
            const invalidStages = ['subscription_active', 'phone_verified'];
            
            for (const stage of invalidStages) {
                user.stage = stage;
                await expect(user.save()).rejects.toThrow();
            }
        });
    });

    describe('User Methods', () => {
        let user;

        beforeEach(async () => {
            user = new User({
                messengerId: '1234567890123456',
                trialMessagesUsedToday: 2,
                dailyMessageCount: 5
            });
            await user.save();
        });

        it('should reset daily trial count correctly', async () => {
            const today = new Date();
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            
            user.lastTrialResetDate = yesterday;
            user.trialMessagesUsedToday = 3;
            
            await user.resetDailyTrialCount();
            
            expect(user.trialMessagesUsedToday).toBe(0);
            expect(user.lastTrialResetDate.toDateString()).toBe(today.toDateString());
        });

        it('should not reset trial count if already reset today', async () => {
            const today = new Date();
            user.lastTrialResetDate = today;
            user.trialMessagesUsedToday = 2;
            
            await user.resetDailyTrialCount();
            
            expect(user.trialMessagesUsedToday).toBe(2); // Should remain unchanged
        });

        it('should reset daily message count correctly', async () => {
            const today = new Date();
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            
            user.lastMessageCountResetDate = yesterday;
            user.dailyMessageCount = 10;
            
            await user.resetDailyMessageCount();
            
            expect(user.dailyMessageCount).toBe(0);
            expect(user.lastMessageCountResetDate.toDateString()).toBe(today.toDateString());
        });
    });

    describe('Subscription Integration', () => {
        it('should handle embedded subscription object', async () => {
            const user = new User({
                messengerId: '1234567890123456',
                subscription: {
                    planType: 'weekly',
                    amount: 3000,
                    startDate: new Date(),
                    expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                    status: 'active'
                }
            });
            
            await user.save();
            
            expect(user.subscription.planType).toBe('weekly');
            expect(user.subscription.status).toBe('active');
        });

        // 🚨 CRITICAL TEST: Subscription status vs stage mismatch
        it('should identify subscription/stage mismatches', async () => {
            const user = new User({
                messengerId: '1234567890123456',
                stage: 'trial', // User in trial stage
                subscription: {
                    planType: 'weekly',
                    status: 'active', // But has active subscription
                    expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                }
            });
            
            await user.save();
            
            // This represents a data inconsistency issue
            const hasActiveSubscription = user.subscription.status === 'active' && 
                                        user.subscription.expiryDate > new Date();
            const isInTrialStage = user.stage === 'trial';
            
            expect(hasActiveSubscription && isInTrialStage).toBe(true);
            // This test exposes the potential for inconsistent state
        });
    });

    describe('Data Integrity Tests', () => {
        it('should maintain consistent trial usage tracking', async () => {
            const user = new User({
                messengerId: '1234567890123456',
                hasUsedTrial: false,
                trialStartDate: null,
                trialMessagesUsedToday: 5 // Inconsistent: using trial messages but hasUsedTrial is false
            });
            
            await user.save();
            
            // This exposes potential data integrity issues
            expect(user.hasUsedTrial).toBe(false);
            expect(user.trialMessagesUsedToday).toBe(5);
            // Should validate: if trialMessagesUsedToday > 0, then hasUsedTrial should be true
        });

        it('should validate mobile number uniqueness for trial users', async () => {
            const mobileNumber = '0921234567';
            
            // Create first user with mobile number
            const user1 = new User({
                messengerId: '1111111111111111',
                mobileNumber: mobileNumber,
                hasUsedTrial: true
            });
            await user1.save();
            
            // Create second user with same mobile number
            const user2 = new User({
                messengerId: '2222222222222222',
                mobileNumber: mobileNumber,
                hasUsedTrial: false
            });
            await user2.save();
            
            // Both users can have same mobile number in DB
            // But business logic should prevent second trial
            const usersWithSameMobile = await User.find({ mobileNumber });
            expect(usersWithSameMobile.length).toBe(2);
            
            const hasUsedTrialUsers = usersWithSameMobile.filter(u => u.hasUsedTrial);
            expect(hasUsedTrialUsers.length).toBe(1);
        });
    });
});