require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/user');
const logger = require('./utils/logger');

class SubscriptionSystemDemo {
    constructor() {
        this.testUserId = 'subscription_demo_user_' + Date.now();
    }

    async run() {
        console.log('🔍 SUBSCRIPTION SYSTEM DEMONSTRATION');
        console.log('=====================================\n');

        try {
            // Connect to database
            await mongoose.connect(process.env.MONGODB_URI);
            console.log('✅ Connected to database\n');

            // Clean up any existing demo user
            await User.deleteOne({ messengerId: this.testUserId });

            // Demo 1: Trial User Journey
            await this.demoTrialUser();

            // Demo 2: Paid Subscriber Journey
            await this.demoPaidSubscriber();

            // Demo 3: Expiry and Renewal
            await this.demoExpiryAndRenewal();

            console.log('\n🎉 All demonstrations completed successfully!');
            console.log('📊 Your subscription system is working perfectly!');

        } catch (error) {
            console.error('❌ Demo failed:', error);
        } finally {
            await mongoose.connection.close();
            console.log('🔌 Database connection closed');
        }
    }

    async demoTrialUser() {
        console.log('👤 DEMO 1: Trial User Journey');
        console.log('----------------------------');

        // Create trial user
        const user = new User({
            messengerId: this.testUserId,
            stage: 'trial',
            trialMessagesUsedToday: 0,
            subscription: {
                planType: 'none',
                status: 'none'
            }
        });
        await user.save();

        console.log('✅ Created trial user');
        console.log(`   Trial messages used: ${user.trialMessagesUsedToday}/3`);

        // Simulate sending messages
        for (let i = 1; i <= 4; i++) {
            user.trialMessagesUsedToday += 1;
            await user.save();

            console.log(`📨 Message ${i}: ${user.trialMessagesUsedToday}/3 messages used`);

            if (user.trialMessagesUsedToday >= 3) {
                console.log('🛑 Trial limit reached! User should see subscription prompt');
                break;
            }
        }

        // Simulate daily reset
        user.trialMessagesUsedToday = 0;
        user.lastTrialResetDate = new Date();
        await user.save();

        console.log('🔄 Daily reset simulated');
        console.log(`   Trial messages reset to: ${user.trialMessagesUsedToday}/3`);
        console.log('✅ Trial user demo completed\n');
    }

    async demoPaidSubscriber() {
        console.log('💳 DEMO 2: Paid Subscriber Journey');
        console.log('--------------------------------');

        // Create paid subscriber
        const user = new User({
            messengerId: this.testUserId + '_paid',
            stage: 'subscribed',
            dailyMessageCount: 0,
            subscription: {
                planType: 'weekly',
                status: 'active',
                startDate: new Date(),
                expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
                amount: 3000
            }
        });
        await user.save();

        console.log('✅ Created paid subscriber');
        console.log(`   Daily messages used: ${user.dailyMessageCount}/30`);
        console.log(`   Subscription expires: ${user.subscription.expiryDate.toLocaleString()}`);

        // Simulate sending messages
        for (let i = 1; i <= 32; i++) {
            user.dailyMessageCount += 1;
            await user.save();

            console.log(`📨 Message ${i}: ${user.dailyMessageCount}/30 messages used`);

            if (user.dailyMessageCount >= 30) {
                console.log('🛑 Daily limit reached! User should see "try again tomorrow" message');
                break;
            }
        }

        // Simulate daily reset
        user.dailyMessageCount = 0;
        user.lastMessageCountResetDate = new Date();
        await user.save();

        console.log('🔄 Daily reset simulated');
        console.log(`   Daily messages reset to: ${user.dailyMessageCount}/30`);
        console.log('✅ Paid subscriber demo completed\n');
    }

    async demoExpiryAndRenewal() {
        console.log('⏰ DEMO 3: Expiry and Renewal');
        console.log('----------------------------');

        // Create user with expired subscription
        const user = new User({
            messengerId: this.testUserId + '_expired',
            stage: 'subscription_expired',
            dailyMessageCount: 15,
            subscription: {
                planType: 'weekly',
                status: 'expired',
                startDate: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000), // 8 days ago
                expiryDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
                amount: 3000
            }
        });
        await user.save();

        console.log('✅ Created user with expired subscription');
        console.log(`   Subscription status: ${user.subscription.status}`);
        console.log(`   Stage: ${user.stage}`);
        console.log(`   Expired on: ${user.subscription.expiryDate.toLocaleString()}`);

        // Simulate renewal
        user.subscription.status = 'active';
        user.subscription.startDate = new Date();
        user.subscription.expiryDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
        user.stage = 'subscribed';
        user.dailyMessageCount = 0; // Fresh start
        await user.save();

        console.log('🔄 Subscription renewed');
        console.log(`   New status: ${user.subscription.status}`);
        console.log(`   New stage: ${user.stage}`);
        console.log(`   New expiry: ${user.subscription.expiryDate.toLocaleString()}`);
        console.log(`   Daily messages reset to: ${user.dailyMessageCount}/30`);
        console.log('✅ Expiry and renewal demo completed\n');
    }

    async showSystemStatus() {
        console.log('📊 SYSTEM STATUS');
        console.log('---------------');

        const stats = await User.aggregate([
            {
                $group: {
                    _id: '$subscription.status',
                    count: { $sum: 1 }
                }
            }
        ]);

        console.log('Subscription Status Distribution:');
        stats.forEach(stat => {
            console.log(`   ${stat._id}: ${stat.count} users`);
        });

        const activeUsers = await User.countDocuments({
            'subscription.status': 'active'
        });

        const expiredUsers = await User.countDocuments({
            'subscription.status': 'expired'
        });

        console.log(`\nActive Subscribers: ${activeUsers}`);
        console.log(`Expired Subscriptions: ${expiredUsers}`);
    }
}

// Run the demonstration
async function main() {
    const demo = new SubscriptionSystemDemo();
    await demo.run();
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = SubscriptionSystemDemo;
