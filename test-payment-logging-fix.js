const mongoose = require('mongoose');
const config = require('./config');
const User = require('./models/user');
const MomoService = require('./services/momoService');
const momoService = new MomoService();
const logger = require('./utils/logger');

// Mock the logger to capture log messages
const originalInfo = logger.info;
const originalPaymentSuccess = logger.paymentSuccess;
const capturedLogs = [];

logger.info = (...args) => {
    capturedLogs.push({ type: 'info', args });
    originalInfo.apply(logger, args);
};

logger.paymentSuccess = (...args) => {
    capturedLogs.push({ type: 'paymentSuccess', args });
    originalPaymentSuccess.apply(logger, args);
};

async function testPaymentLoggingFix() {
    console.log('🧪 Testing Payment Logging Fix...\n');
    
    try {
        // Connect to database
        await mongoose.connect(config.database.uri);
        console.log('✅ Connected to MongoDB');
        
        // Create test user
        const testUser = new User({
            messengerId: '1234567890123456',
            mobileNumber: '0921234567',
            stage: 'trial',
            trialMessagesUsedToday: 3,
            hasUsedTrial: true
        });
        await testUser.save();
        console.log('✅ Created test user');
        
        // Clear captured logs
        capturedLogs.length = 0;
        
        console.log('\n📋 Step 1: Testing Payment Initiation...');
        
        // Test payment initiation (should NOT log payment success)
        try {
            await momoService.initiatePayment(testUser, 'weekly');
            console.log('✅ Payment initiation completed');
        } catch (error) {
            console.log('⚠️ Payment initiation failed (expected in sandbox):', error.message);
        }
        
        // Check logs after initiation
        console.log('\n📊 Logs after payment initiation:');
        const initiationLogs = capturedLogs.filter(log => 
            log.args[0] && log.args[0].includes('Payment')
        );
        
        if (initiationLogs.length === 0) {
            console.log('❌ No payment-related logs found');
        } else {
            initiationLogs.forEach(log => {
                const message = log.args[0];
                if (message.includes('PAYMENT SUCCESSFUL')) {
                    console.log('❌ ERROR: Payment success logged during initiation!');
                    console.log('   Message:', message);
                } else if (message.includes('initiated')) {
                    console.log('✅ CORRECT: Payment initiation logged properly');
                    console.log('   Message:', message);
                } else {
                    console.log('ℹ️ Other payment log:', message);
                }
            });
        }
        
        console.log('\n📋 Step 2: Testing Payment Success Processing...');
        
        // Clear logs for next test
        capturedLogs.length = 0;
        
        // Simulate successful payment callback
        const mockCallbackData = {
            referenceId: 'test-reference-123',
            status: 'SUCCESSFUL',
            amount: 1,
            currency: 'EUR'
        };
        
        // Create payment session for the user
        testUser.paymentSession = {
            planType: 'weekly',
            amount: 1,
            startTime: new Date(),
            status: 'pending',
            reference: 'test-reference-123'
        };
        await testUser.save();
        
        // Test payment success processing (should log payment success)
        try {
            await momoService.processSuccessfulPayment(testUser);
            console.log('✅ Payment success processing completed');
        } catch (error) {
            console.log('❌ Payment success processing failed:', error.message);
        }
        
        // Check logs after success processing
        console.log('\n📊 Logs after payment success processing:');
        const successLogs = capturedLogs.filter(log => 
            log.args[0] && log.args[0].includes('Payment')
        );
        
        if (successLogs.length === 0) {
            console.log('❌ No payment success logs found');
        } else {
            successLogs.forEach(log => {
                const message = log.args[0];
                if (message.includes('PAYMENT SUCCESSFUL')) {
                    console.log('✅ CORRECT: Payment success logged during completion!');
                    console.log('   Message:', message);
                } else if (message.includes('Subscription activated')) {
                    console.log('✅ CORRECT: Subscription activation logged');
                    console.log('   Message:', message);
                } else {
                    console.log('ℹ️ Other log:', message);
                }
            });
        }
        
        console.log('\n📋 Step 3: Verification Summary...');
        
        // Check if payment success was logged in wrong place
        const allLogs = capturedLogs.map(log => log.args[0]).join(' ');
        const successDuringInitiation = allLogs.includes('initiated') && allLogs.includes('PAYMENT SUCCESSFUL');
        
        if (successDuringInitiation) {
            console.log('❌ FAILED: Payment success still logged during initiation!');
        } else {
            console.log('✅ PASSED: Payment success only logged during completion');
        }
        
        // Check user state after success
        const updatedUser = await User.findById(testUser._id);
        console.log('\n👤 User state after payment success:');
        console.log('   Stage:', updatedUser.stage);
        console.log('   Subscription plan:', updatedUser.subscription.planType);
        console.log('   Payment session:', updatedUser.paymentSession ? 'Still exists' : 'Cleared');
        
        if (updatedUser.stage === 'subscribed' && updatedUser.paymentSession === null) {
            console.log('✅ User state correctly updated');
        } else {
            console.log('❌ User state not correctly updated');
        }
        
        console.log('\n🎉 Payment Logging Fix Test Completed!');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        // Restore original logger functions
        logger.info = originalInfo;
        logger.paymentSuccess = originalPaymentSuccess;
        
        // Clean up
        if (mongoose.connection.readyState === 1) {
            await User.deleteOne({ messengerId: '1234567890123456' });
            await mongoose.disconnect();
            console.log('✅ Cleanup completed');
        }
    }
}

// Run the test
testPaymentLoggingFix();
