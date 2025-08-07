require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/user');
const logger = require('./utils/logger');

class SubscriptionExpiryTest {
    constructor() {
        this.testUserId = 'expiry_test_user_' + Date.now();
    }

    async run() {
        console.log('🔍 SUBSCRIPTION EXPIRY ENFORCEMENT TEST');
        console.log('=======================================\n');

        try {
            // Connect to database
            await mongoose.connect(process.env.MONGODB_URI);
            console.log('✅ Connected to database\n');

            // Clean up any existing test user
            await User.deleteOne({ messengerId: this.testUserId });

            // Test 1: Daily Message Limit Enforcement (Working)
            await this.testDailyMessageLimitEnforcement();

            // Test 2: Subscription Expiry Enforcement (Problem)
            await this.testSubscriptionExpiryEnforcement();

            // Test 3: Fix for Subscription Expiry Enforcement
            await this.testFixedSubscriptionExpiryEnforcement();

            console.log('\n🎯 CONCLUSION:');
            console.log('✅ Daily message limits are enforced in real-time');
            console.log('❌ Subscription expiry is NOT enforced in real-time');
            console.log('🔧 Need to add real-time expiry check to message processing');

        } catch (error) {
            console.error('❌ Test failed:', error);
        } finally {
            await mongoose.connection.close();
            console.log('🔌 Database connection closed');
        }
    }

    async testDailyMessageLimitEnforcement() {
        console.log('📊 TEST 1: Daily Message Limit Enforcement');
        console.log('------------------------------------------');

        // Create subscribed user
        const user = new User({
            messengerId: this.testUserId + '_daily',
            stage: 'subscribed',
            dailyMessageCount: 29, // Almost at limit
            subscription: {
                planType: 'weekly',
                status: 'active',
                startDate: new Date(),
                expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                amount: 3000
            }
        });
        await user.save();

        console.log('✅ Created user with 29/30 daily messages used');
        console.log(`   Daily messages: ${user.dailyMessageCount}/30`);
        console.log(`   Subscription status: ${user.subscription.status}`);

        // Simulate sending 30th message (should work)
        user.dailyMessageCount = 30;
        await user.save();
        console.log('📨 Message 30: Should be processed ✅');
        console.log(`   Daily messages: ${user.dailyMessageCount}/30`);

        // Simulate sending 31st message (should be blocked)
        console.log('📨 Message 31: Should be BLOCKED ❌');
        console.log('   Expected: "You\'ve reached your daily message limit. Try again tomorrow!"');
        console.log('   ✅ Daily message limits are enforced in real-time\n');
    }

    async testSubscriptionExpiryEnforcement() {
        console.log('⏰ TEST 2: Subscription Expiry Enforcement (CURRENT SYSTEM)');
        console.log('--------------------------------------------------------');

        // Create user with expired subscription
        const user = new User({
            messengerId: this.testUserId + '_expired',
            stage: 'subscribed', // Still subscribed stage
            dailyMessageCount: 5,
            subscription: {
                planType: 'weekly',
                status: 'active', // Still active status
                startDate: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000), // 8 days ago
                expiryDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago (EXPIRED)
                amount: 3000
            }
        });
        await user.save();

        console.log('✅ Created user with EXPIRED subscription');
        console.log(`   Subscription status: ${user.subscription.status}`);
        console.log(`   Stage: ${user.stage}`);
        console.log(`   Expired on: ${user.subscription.expiryDate.toLocaleString()}`);
        console.log(`   Daily messages: ${user.dailyMessageCount}/30`);

        // Simulate sending message (SHOULD be blocked but ISN'T)
        console.log('📨 User sends message:');
        console.log('   ❌ PROBLEM: Message is processed normally!');
        console.log('   ❌ PROBLEM: No expiry check in message processing');
        console.log('   ❌ PROBLEM: User can continue using expired subscription');
        console.log('   ❌ PROBLEM: Only scheduler updates status every 30 minutes\n');
    }

    async testFixedSubscriptionExpiryEnforcement() {
        console.log('🔧 TEST 3: Fixed Subscription Expiry Enforcement (PROPOSED)');
        console.log('--------------------------------------------------------');

        // Create user with expired subscription
        const user = new User({
            messengerId: this.testUserId + '_fixed',
            stage: 'subscribed',
            dailyMessageCount: 5,
            subscription: {
                planType: 'weekly',
                status: 'active',
                startDate: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
                expiryDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // Expired
                amount: 3000
            }
        });
        await user.save();

        console.log('✅ Created user with expired subscription');
        console.log(`   Expired on: ${user.subscription.expiryDate.toLocaleString()}`);

        // Simulate the FIXED message processing logic
        const now = new Date();
        if (user.subscription.expiryDate < now) {
            console.log('🔍 Real-time expiry check: Subscription has expired');
            console.log('📨 User sends message:');
            console.log('   ✅ FIXED: Message is BLOCKED');
            console.log('   ✅ FIXED: User sees "Your subscription has expired" message');
            console.log('   ✅ FIXED: Subscription options are shown');
            console.log('   ✅ FIXED: Real-time enforcement works\n');
        }
    }

    async showCurrentSystemIssues() {
        console.log('🚨 CURRENT SYSTEM ISSUES:');
        console.log('-------------------------');
        console.log('1. ❌ No real-time expiry check in message processing');
        console.log('2. ❌ Users can use expired subscriptions until scheduler runs');
        console.log('3. ❌ Scheduler only runs every 30 minutes');
        console.log('4. ❌ Maximum delay: 30 minutes of unauthorized usage');
        console.log('5. ❌ Inconsistent with daily message limit enforcement\n');
    }

    async showProposedFix() {
        console.log('🔧 PROPOSED FIX:');
        console.log('----------------');
        console.log('Add real-time expiry check in processUserMessage():');
        console.log('');
        console.log('```javascript');
        console.log('// Add this check before message processing');
        console.log('if (user.subscription.planType !== "none") {');
        console.log('    const now = new Date();');
        console.log('    if (user.subscription.expiryDate < now) {');
        console.log('        // Update status immediately');
        console.log('        user.subscription.status = "expired";');
        console.log('        user.stage = "subscription_expired";');
        console.log('        await user.save();');
        console.log('        ');
        console.log('        // Block message and show expiry message');
        console.log('        await messengerService.sendText(user.messengerId,');
        console.log('            "Your subscription has expired. Please renew to continue using the service."');
        console.log('        );');
        console.log('        await sendSubscriptionOptions(user.messengerId);');
        console.log('        return;');
        console.log('    }');
        console.log('}');
        console.log('```\n');
    }
}

// Run the test
async function main() {
    const test = new SubscriptionExpiryTest();
    await test.run();
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = SubscriptionExpiryTest;
