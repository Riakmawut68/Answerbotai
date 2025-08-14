#!/usr/bin/env node

const mongoose = require('mongoose');
const config = require('./config');
const MomoService = require('./services/momoService');
const User = require('./models/user');
const SandboxBypassService = require('./services/sandboxBypassService');

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
        // Create a test user with the EXACT number from the screenshot
        const testUser = new User({
            messengerId: 'DIAGNOSTIC_TEST_' + Date.now(),
            mobileNumber: '0927654321', // EXACT number from screenshot
            paymentMobileNumber: '0927654321',
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

async function runDiagnostic() {
    try {
        console.log('\n🔍 [SANDBOX BYPASS DIAGNOSTIC]');
        console.log('=====================================');
        
        // 1. Create test user with problematic number
        const testUser = await createTestUser();
        console.log(`\n👤 Test User: ${testUser.messengerId}`);
        console.log(`📱 Phone: ${testUser.paymentMobileNumber}`);
        console.log(`🎯 Stage: ${testUser.stage}`);
        
        // 2. Check configuration
        console.log('\n🔧 [CONFIGURATION CHECK]');
        console.log('=====================================');
        console.log(`Environment: ${config.app.environment}`);
        console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
        console.log(`Sandbox bypass enabled: ${config.sandbox?.enableBypass}`);
        console.log(`Test numbers: ${config.sandbox?.testPhoneNumbers?.join(', ') || 'none'}`);
        
        // 3. Initialize services
        console.log('\n🚀 [SERVICE INITIALIZATION]');
        console.log('=====================================');
        const momoService = new MomoService();
        const sandboxBypass = new SandboxBypassService();
        console.log('✅ MomoService initialized');
        console.log('✅ SandboxBypassService initialized');
        
        // 4. Check bypass service state
        console.log('\n🔓 [BYPASS SERVICE STATE]');
        console.log('=====================================');
        console.log(`Bypass enabled: ${sandboxBypass.isBypassEnabled()}`);
        console.log(`Test numbers: ${sandboxBypass.getTestPhoneNumbers().join(', ')}`);
        console.log(`Hardcoded test number: ${sandboxBypass.getHardcodedTestNumber()}`);
        
        // 5. Test bypass detection
        console.log('\n🎯 [BYPASS DETECTION TEST]');
        console.log('=====================================');
        const shouldBypass = sandboxBypass.shouldBypassPayment(testUser.paymentMobileNumber);
        console.log(`Phone number: ${testUser.paymentMobileNumber}`);
        console.log(`Should bypass: ${shouldBypass}`);
        console.log(`Number in test list: ${sandboxBypass.getTestPhoneNumbers().includes(testUser.paymentMobileNumber)}`);
        
        // 6. Test payment initiation
        console.log('\n💰 [PAYMENT INITIATION TEST]');
        console.log('=====================================');
        console.log('Initiating payment with bypass...');
        
        const paymentResult = await momoService.initiatePayment(testUser, 'monthly');
        
        console.log('\n✅ Payment initiated:');
        console.log(`   ├── Reference: ${paymentResult.reference}`);
        console.log(`   ├── Amount: ${paymentResult.amount}`);
        console.log(`   ├── Status: ${paymentResult.status}`);
        console.log(`   └── Sandbox bypass: ${paymentResult.sandboxBypass || false}`);
        
        // 7. Check user state after payment
        console.log('\n🔍 [USER STATE AFTER PAYMENT]');
        console.log('=====================================');
        const updatedUser = await User.findById(testUser._id);
        
        console.log('User state:');
        console.log(`   ├── Stage: ${updatedUser.stage}`);
        console.log(`   ├── Subscription status: ${updatedUser.subscription?.status || 'none'}`);
        console.log(`   ├── Plan type: ${updatedUser.subscription?.planType || 'none'}`);
        console.log(`   └── Payment session: ${updatedUser.paymentSession ? 'exists' : 'none'}`);
        
        // 8. Analyze the issue
        console.log('\n🚨 [ISSUE ANALYSIS]');
        console.log('=====================================');
        
        if (shouldBypass && !paymentResult.sandboxBypass) {
            console.log('❌ ISSUE FOUND: Bypass should trigger but didn\'t');
            console.log('   ├── Bypass detection: ✅ Working');
            console.log('   ├── Bypass execution: ❌ Failed');
            console.log('   └── Check MomoService bypass logic');
        } else if (!shouldBypass && paymentResult.sandboxBypass) {
            console.log('❌ ISSUE FOUND: Bypass triggered unexpectedly');
            console.log('   ├── Bypass detection: ❌ Wrong');
            console.log('   ├── Bypass execution: ✅ Working');
            console.log('   └── Check test number configuration');
        } else if (shouldBypass && paymentResult.sandboxBypass) {
            console.log('✅ BYPASS WORKING: All systems operational');
            console.log('   ├── Bypass detection: ✅ Working');
            console.log('   ├── Bypass execution: ✅ Working');
            console.log('   └── User should have premium access');
        } else {
            console.log('❌ ISSUE FOUND: Bypass completely broken');
            console.log('   ├── Bypass detection: ❌ Failed');
            console.log('   ├── Bypass execution: ❌ Failed');
            console.log('   └── Check configuration and service initialization');
        }
        
        // 9. Check if user got premium access
        if (updatedUser.stage === 'subscribed') {
            console.log('\n🎉 [SUCCESS] User got premium access!');
        } else {
            console.log('\n⚠️ [ISSUE] User still in payment stage');
            console.log(`   ├── Expected: subscribed`);
            console.log(`   ├── Actual: ${updatedUser.stage}`);
            console.log(`   └── Bypass didn't complete the flow`);
        }
        
        // 10. Cleanup
        console.log('\n🧹 Cleaning up test data...');
        await User.deleteOne({ _id: testUser._id });
        console.log('✅ Test user removed');
        
        console.log('\n🔍 [DIAGNOSTIC COMPLETED]');
        console.log('=====================================');
        
    } catch (error) {
        console.error('\n❌ [DIAGNOSTIC FAILED]');
        console.error('=====================================');
        console.error('Error:', error.message);
        console.error('Stack:', error.stack);
    }
}

async function main() {
    try {
        await connectDB();
        await runDiagnostic();
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
    console.log('\n\n🛑 Diagnostic interrupted by user');
    await mongoose.connection.close();
    process.exit(0);
});

main().catch(async (error) => {
    console.error('Fatal error:', error.message);
    await mongoose.connection.close();
    process.exit(1);
});
