require('dotenv').config();
const mongoose = require('mongoose');
const logger = require('./utils/logger');
const User = require('./models/user');
const MomoService = require('./services/momoService');
const config = require('./config');

async function testPaymentSessionClear() {
    console.log('\n🧪 PAYMENT SESSION CLEAR TEST');
    console.log('=' .repeat(50));
    
    try {
        // Connect to database
        await mongoose.connect(config.database.uri, config.database.options);
        console.log('✅ Connected to database');
        
        // Initialize MoMo service
        const momoService = new MomoService();
        
        // Test data
        const testUserId = 'clear_test_user_' + Date.now();
        
        // Clear existing test user
        await User.deleteOne({ messengerId: testUserId });
        
        // Create test user with payment session
        const user = new User({
            messengerId: testUserId,
            stage: 'awaiting_payment',
            paymentSession: {
                planType: 'weekly',
                amount: 3000,
                startTime: new Date(),
                status: 'pending',
                reference: 'CLEAR_TEST_' + Date.now()
            }
        });
        
        await user.save();
        console.log('✅ Created test user with payment session');
        console.log(`   - Payment session exists: ${!!user.paymentSession}`);
        console.log(`   - Payment session reference: ${user.paymentSession.reference}`);
        
        // Test 1: Direct assignment
        console.log('\n🔧 Test 1: Direct Assignment');
        console.log('-'.repeat(30));
        
        user.paymentSession = null;
        await user.save();
        
        // Fetch user again to verify
        const userAfterDirect = await User.findOne({ messengerId: testUserId });
        console.log(`   - Payment session after direct assignment: ${userAfterDirect.paymentSession ? 'Still exists' : 'Cleared'}`);
        
        // Test 2: Using processSuccessfulPayment
        console.log('\n🔧 Test 2: Using processSuccessfulPayment');
        console.log('-'.repeat(30));
        
        // Recreate payment session
        user.paymentSession = {
            planType: 'weekly',
            amount: 3000,
            startTime: new Date(),
            status: 'pending',
            reference: 'CLEAR_TEST_2_' + Date.now()
        };
        await user.save();
        console.log('✅ Recreated payment session');
        
        // Call processSuccessfulPayment
        const result = await momoService.processSuccessfulPayment(user);
        console.log('✅ processSuccessfulPayment completed');
        console.log(`   - Result success: ${result.success}`);
        
        // Fetch user again to verify
        const userAfterProcess = await User.findOne({ messengerId: testUserId });
        console.log(`   - Payment session after processSuccessfulPayment: ${userAfterProcess.paymentSession ? 'Still exists' : 'Cleared'}`);
        console.log(`   - Stage after processSuccessfulPayment: ${userAfterProcess.stage}`);
        console.log(`   - Subscription status: ${userAfterProcess.subscription.status}`);
        
        // Test 3: Manual verification
        console.log('\n🔧 Test 3: Manual Verification');
        console.log('-'.repeat(30));
        
        // Create another test user
        const testUserId2 = 'clear_test_user_2_' + Date.now();
        const user2 = new User({
            messengerId: testUserId2,
            stage: 'awaiting_payment',
            paymentSession: {
                planType: 'weekly',
                amount: 3000,
                startTime: new Date(),
                status: 'pending',
                reference: 'CLEAR_TEST_3_' + Date.now()
            }
        });
        
        await user2.save();
        console.log('✅ Created second test user');
        
        // Manually clear payment session
        user2.paymentSession = null;
        user2.stage = 'subscribed';
        user2.subscription = {
            planType: 'weekly',
            amount: 3000,
            startDate: new Date(),
            expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            status: 'active'
        };
        
        await user2.save();
        console.log('✅ Manually cleared payment session');
        
        // Fetch user again to verify
        const user2AfterManual = await User.findOne({ messengerId: testUserId2 });
        console.log(`   - Payment session after manual clear: ${user2AfterManual.paymentSession ? 'Still exists' : 'Cleared'}`);
        console.log(`   - Stage after manual clear: ${user2AfterManual.stage}`);
        
        // Summary
        console.log('\n📊 SUMMARY');
        console.log('-'.repeat(30));
        console.log(`✅ Direct assignment: ${userAfterDirect.paymentSession ? 'FAILED' : 'SUCCESS'}`);
        console.log(`✅ processSuccessfulPayment: ${userAfterProcess.paymentSession ? 'FAILED' : 'SUCCESS'}`);
        console.log(`✅ Manual clear: ${user2AfterManual.paymentSession ? 'FAILED' : 'SUCCESS'}`);
        
        // Cleanup
        console.log('\n🧹 Cleaning up test data...');
        await User.deleteOne({ messengerId: testUserId });
        await User.deleteOne({ messengerId: testUserId2 });
        console.log('✅ Test data cleaned up');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('Stack trace:', error.stack);
    } finally {
        await mongoose.connection.close();
        console.log('✅ Database connection closed');
    }
}

// Run the test
testPaymentSessionClear();
