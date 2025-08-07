require('dotenv').config();
const mongoose = require('mongoose');
const config = require('./config');
const logger = require('./utils/logger');
const User = require('./models/user');
const paymentTimeoutScheduler = require('./schedulers/paymentTimeout');

async function testPaymentTimeout() {
    console.log('\n⏰ PAYMENT TIMEOUT TEST');
    console.log('=' .repeat(40));
    
    try {
        // Connect to database
        await mongoose.connect(config.database.uri, config.database.options);
        console.log('✅ Connected to database');
        
        // Create test users with different payment states
        const testUsers = [
            {
                messengerId: 'timeout_test_user_1',
                stage: 'awaiting_payment',
                paymentSession: {
                    planType: 'weekly',
                    amount: 3000,
                    startTime: new Date(Date.now() - 16 * 60 * 1000), // 16 minutes ago (expired)
                    status: 'pending',
                    reference: 'EXPIRED_REF_1'
                }
            },
            {
                messengerId: 'timeout_test_user_2',
                stage: 'awaiting_payment',
                paymentSession: {
                    planType: 'monthly',
                    amount: 6500,
                    startTime: new Date(Date.now() - 10 * 60 * 1000), // 10 minutes ago (not expired)
                    status: 'pending',
                    reference: 'ACTIVE_REF_2'
                }
            },
            {
                messengerId: 'timeout_test_user_3',
                stage: 'trial',
                paymentSession: null // No payment session
            }
        ];
        
        console.log('📋 Creating test users...');
        
        // Clear existing test users
        for (const user of testUsers) {
            await User.deleteOne({ messengerId: user.messengerId });
        }
        
        // Create test users
        for (const userData of testUsers) {
            const user = new User(userData);
            await user.save();
            console.log(`   ✅ Created ${userData.messengerId} (${userData.stage})`);
        }
        
        // Run payment timeout check
        console.log('\n🔍 Running payment timeout check...');
        await paymentTimeoutScheduler.checkExpiredPayments();
        
        // Verify results
        console.log('\n🔍 Verifying results...');
        
        const user1 = await User.findOne({ messengerId: 'timeout_test_user_1' });
        const user2 = await User.findOne({ messengerId: 'timeout_test_user_2' });
        const user3 = await User.findOne({ messengerId: 'timeout_test_user_3' });
        
        console.log('\n📊 Test Results:');
        console.log('-'.repeat(30));
        
        // User 1 (expired payment) - should be cleaned up
        if (user1 && user1.stage === 'trial' && !user1.paymentSession) {
            console.log('✅ User 1 (expired): Correctly cleaned up');
        } else {
            console.log('❌ User 1 (expired): Not cleaned up properly');
            console.log(`   - Stage: ${user1?.stage}`);
            console.log(`   - Payment session: ${user1?.paymentSession ? 'Still exists' : 'Cleared'}`);
        }
        
        // User 2 (active payment) - should remain unchanged
        if (user2 && user2.stage === 'awaiting_payment' && user2.paymentSession) {
            console.log('✅ User 2 (active): Correctly unchanged');
        } else {
            console.log('❌ User 2 (active): Incorrectly modified');
            console.log(`   - Stage: ${user2?.stage}`);
            console.log(`   - Payment session: ${user2?.paymentSession ? 'Exists' : 'Missing'}`);
        }
        
        // User 3 (no payment) - should remain unchanged
        if (user3 && user3.stage === 'trial' && !user3.paymentSession) {
            console.log('✅ User 3 (no payment): Correctly unchanged');
        } else {
            console.log('❌ User 3 (no payment): Incorrectly modified');
            console.log(`   - Stage: ${user3?.stage}`);
            console.log(`   - Payment session: ${user3?.paymentSession ? 'Exists' : 'Missing'}`);
        }
        
        // Cleanup
        console.log('\n🧹 Cleaning up test data...');
        for (const user of testUsers) {
            await User.deleteOne({ messengerId: user.messengerId });
        }
        console.log('✅ Test data cleaned up');
        
        console.log('\n🎊 Payment timeout test completed!');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('Stack trace:', error.stack);
    } finally {
        await mongoose.connection.close();
        console.log('✅ Database connection closed');
    }
}

// Run the test
testPaymentTimeout();
