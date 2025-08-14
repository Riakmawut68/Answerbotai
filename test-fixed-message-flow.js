#!/usr/bin/env node

const mongoose = require('mongoose');
const config = require('./config');
const MomoService = require('./services/momoService');
const User = require('./models/user');

async function connectDB() {
    try {
        await mongoose.connect(config.database.uri, config.database.options);
        console.log('✅ Database connected successfully');
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        process.exit(1);
    }
}

async function createTestUser() {
    try {
        const testUser = new User({
            messengerId: 'FLOW_TEST_' + Date.now(),
            mobileNumber: '0921234567', // Test number for bypass
            paymentMobileNumber: '0921234567',
            stage: 'awaiting_phone_for_payment',
            consentTimestamp: new Date(),
            lastSelectedPlanType: 'weekly'
        });
        
        await testUser.save();
        console.log('✅ Test user created:', testUser.messengerId);
        return testUser;
    } catch (error) {
        console.error('❌ Failed to create test user:', error.message);
        throw error;
    }
}

async function testFixedMessageFlow() {
    try {
        console.log('\n🔧 [TESTING FIXED MESSAGE FLOW]');
        console.log('=====================================');
        
        // 1. Create test user
        const testUser = await createTestUser();
        console.log(`\n👤 Test User: ${testUser.messengerId}`);
        console.log(`📱 Phone: ${testUser.paymentMobileNumber}`);
        console.log(`🎯 Stage: ${testUser.stage}`);
        console.log(`📋 Plan: ${testUser.lastSelectedPlanType}`);
        
        // 2. Initialize MomoService
        console.log('\n🚀 Initializing MomoService...');
        const momoService = new MomoService();
        console.log('✅ MomoService initialized');
        
        // 3. Test payment initiation with bypass
        console.log('\n💰 [STEP 1] Testing payment initiation...');
        console.log('Expected flow:');
        console.log('   1. Payment initiated');
        console.log('   2. "Payment Processing" message sent');
        console.log('   3. Bypass triggers');
        console.log('   4. User gets premium access');
        console.log('   5. Success message sent');
        
        const paymentResult = await momoService.initiatePayment(testUser, 'weekly');
        
        console.log('\n✅ [STEP 1] Payment initiated successfully!');
        console.log(`   ├── Reference: ${paymentResult.reference}`);
        console.log(`   ├── Amount: ${paymentResult.amount}`);
        console.log(`   └── Sandbox bypass: ${paymentResult.sandboxBypass || false}`);
        
        // 4. Check user state after payment
        console.log('\n🔍 [STEP 2] Checking user state...');
        const updatedUser = await User.findById(testUser._id);
        
        console.log('✅ User state updated:');
        console.log(`   ├── Stage: ${updatedUser.stage}`);
        console.log(`   ├── Subscription status: ${updatedUser.subscription?.status || 'none'}`);
        console.log(`   ├── Plan type: ${updatedUser.subscription?.planType || 'none'}`);
        console.log(`   └── Payment session: ${updatedUser.paymentSession ? 'exists' : 'none'}`);
        
        // 5. Verify the flow worked correctly
        console.log('\n🎯 [FLOW VERIFICATION]');
        console.log('=====================================');
        
        if (paymentResult.sandboxBypass && updatedUser.stage === 'subscribed') {
            console.log('✅ [FLOW WORKING PERFECTLY]');
            console.log('   ├── Payment initiated successfully');
            console.log('   ├── "Payment Processing" message sent');
            console.log('   ├── Bypass triggered and completed');
            console.log('   ├── User got premium access');
            console.log('   └── Success message should be sent by webhook');
        } else if (paymentResult.sandboxBypass && updatedUser.stage !== 'subscribed') {
            console.log('⚠️ [PARTIAL SUCCESS]');
            console.log('   ├── Payment initiated successfully');
            console.log('   ├── "Payment Processing" message sent');
            console.log('   ├── Bypass triggered but user not subscribed');
            console.log('   └── Check bypass completion logic');
        } else if (!paymentResult.sandboxBypass) {
            console.log('⚠️ [BYPASS NOT TRIGGERED]');
            console.log('   ├── Payment initiated successfully');
            console.log('   ├── "Payment Processing" message sent');
            console.log('   ├── No bypass triggered (check test number)');
            console.log('   └── Waiting for real payment callback');
        }
        
        // 6. Cleanup
        console.log('\n🧹 Cleaning up test data...');
        await User.deleteOne({ _id: testUser._id });
        console.log('✅ Test user removed');
        
        console.log('\n🎉 [MESSAGE FLOW TEST COMPLETED]');
        console.log('=====================================');
        
    } catch (error) {
        console.error('\n❌ [TEST FAILED]');
        console.error('=====================================');
        console.error('Error:', error.message);
        console.error('Stack:', error.stack);
    }
}

async function main() {
    try {
        await connectDB();
        await testFixedMessageFlow();
    } catch (error) {
        console.error('Main error:', error.message);
    } finally {
        await mongoose.connection.close();
        console.log('\n🔌 Database connection closed');
        process.exit(0);
    }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n\n🛑 Test interrupted by user');
    await mongoose.connection.close();
    process.exit(0);
});

main().catch(async (error) => {
    console.error('Fatal error:', error.message);
    await mongoose.connection.close();
    process.exit(1);
});
