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
        // Create a test user with test phone number
        const testUser = new User({
            messengerId: 'TEST_USER_' + Date.now(),
            mobileNumber: '0921234567', // Test number from config
            paymentMobileNumber: '0921234567',
            stage: 'awaiting_payment',
            consentTimestamp: new Date()
        });
        
        await testUser.save();
        console.log('✅ Test user created:', testUser.messengerId);
        return testUser;
    } catch (error) {
        console.error('❌ Failed to create test user:', error.message);
        throw error;
    }
}

async function testSandboxBypassFlow() {
    try {
        console.log('\n🔓 [SANDBOX BYPASS FLOW TEST]');
        console.log('=====================================');
        
        // 1. Create test user
        const testUser = await createTestUser();
        console.log(`\n👤 Test User: ${testUser.messengerId}`);
        console.log(`📱 Phone: ${testUser.paymentMobileNumber}`);
        console.log(`🎯 Stage: ${testUser.stage}`);
        
        // 2. Initialize MomoService
        console.log('\n🚀 Initializing MomoService...');
        const momoService = new MomoService();
        console.log('✅ MomoService initialized');
        
        // 3. Check bypass status
        console.log('\n🔍 Checking bypass configuration...');
        const bypassEnabled = momoService.sandboxBypass.isBypassEnabled();
        const testNumbers = momoService.sandboxBypass.getTestPhoneNumbers();
        console.log(`🔓 Bypass enabled: ${bypassEnabled}`);
        console.log(`📱 Test numbers: ${testNumbers.join(', ')}`);
        console.log(`🎯 Current number matches: ${testNumbers.includes(testUser.paymentMobileNumber)}`);
        
        if (!bypassEnabled) {
            console.log('❌ Bypass is disabled. Cannot proceed with test.');
            return;
        }
        
        // 4. Test payment initiation
        console.log('\n💰 [STEP 1] Initiating payment...');
        console.log('   ├── Plan: weekly');
        console.log('   ├── Amount: ' + config.momo.getPaymentAmount('weekly') + ' ' + config.momo.getPaymentCurrency());
        console.log('   └── Environment: ' + config.app.environment);
        
        const paymentResult = await momoService.initiatePayment(testUser, 'weekly');
        
        console.log('\n✅ [STEP 1] Payment initiated successfully!');
        console.log(`   ├── Reference: ${paymentResult.reference}`);
        console.log(`   ├── Amount: ${paymentResult.amount}`);
        console.log(`   ├── Status: ${paymentResult.status}`);
        console.log(`   └── Sandbox bypass: ${paymentResult.sandboxBypass || false}`);
        
        // 5. Check user state after payment
        console.log('\n🔍 [STEP 2] Checking user state...');
        // Refresh user data from database
        const updatedUser = await User.findById(testUser._id);
        
        console.log('✅ User state updated:');
        console.log(`   ├── Stage: ${updatedUser.stage}`);
        console.log(`   ├── Subscription status: ${updatedUser.subscription?.status || 'none'}`);
        console.log(`   ├── Plan type: ${updatedUser.subscription?.planType || 'none'}`);
        console.log(`   └── Expiry date: ${updatedUser.subscription?.expiryDate || 'none'}`);
        
        // 6. Verify bypass was triggered
        if (paymentResult.sandboxBypass) {
            console.log('\n🎭 [SANDBOX BYPASS SUCCESS]');
            console.log('   ├── Real sandbox payment initiated');
            console.log('   ├── Fake callback simulated');
            console.log('   ├── User subscription activated');
            console.log('   └── Premium access granted');
        } else {
            console.log('\n⚠️  [SANDBOX BYPASS NOT TRIGGERED]');
            console.log('   ├── Payment went through normal flow');
            console.log('   ├── No bypass detected');
            console.log('   └── Check test phone number configuration');
        }
        
        // 7. Cleanup
        console.log('\n🧹 Cleaning up test data...');
        await User.deleteOne({ _id: testUser._id });
        console.log('✅ Test user removed');
        
        console.log('\n🎉 [TEST COMPLETED SUCCESSFULLY]');
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
        await testSandboxBypassFlow();
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
