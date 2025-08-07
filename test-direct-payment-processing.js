require('dotenv').config();
const mongoose = require('mongoose');
const logger = require('./utils/logger');
const User = require('./models/user');
const MomoService = require('./services/momoService');
const config = require('./config');

async function testDirectPaymentProcessing() {
    console.log('\n🧪 DIRECT PAYMENT PROCESSING TEST');
    console.log('=' .repeat(50));
    
    try {
        // Connect to database
        await mongoose.connect(config.database.uri, config.database.options);
        console.log('✅ Connected to database');
        
        // Initialize MoMo service
        const momoService = new MomoService();
        
        // Test data
        const testUserId = 'direct_test_user_' + Date.now();
        const testReference = 'DIRECT_TEST_' + Date.now();
        const planType = 'weekly';
        const sspAmount = config.momo.displayAmounts[planType];
        const paymentAmount = config.momo.getPaymentAmount(planType);
        const currency = config.momo.getPaymentCurrency();
        
        console.log(`💰 Test Configuration:`);
        console.log(`   - Plan Type: ${planType}`);
        console.log(`   - SSP Amount: ${sspAmount} SSP (display)`);
        console.log(`   - Payment Amount: ${paymentAmount} ${currency}`);
        console.log(`   - Currency: ${currency}`);
        console.log(`   - Environment: ${config.app.environment}`);
        
        // Clear existing test user
        await User.deleteOne({ messengerId: testUserId });
        
        // Create test user with payment session
        const user = new User({
            messengerId: testUserId,
            stage: 'awaiting_payment',
            paymentSession: {
                planType: planType,
                amount: sspAmount, // Store SSP amount in session
                startTime: new Date(),
                status: 'pending',
                reference: testReference
            },
            paymentMobileNumber: '0921234567'
        });
        
        await user.save();
        console.log('✅ Created test user with payment session');
        
        // Test 1: Direct payment processing (bypassing API verification)
        console.log('\n🎉 Test 1: Direct Payment Processing');
        console.log('-'.repeat(40));
        
        // Call the processSuccessfulPayment method directly
        const result = await momoService.processSuccessfulPayment(user);
        console.log('✅ Direct payment processing completed');
        console.log(`   - Result:`, result);
        
        // Verify user state
        const updatedUser = await User.findOne({ messengerId: testUserId });
        console.log('\n🔍 User State After Direct Processing:');
        console.log(`   - Stage: ${updatedUser.stage}`);
        console.log(`   - Subscription Plan: ${updatedUser.subscription.planType}`);
        console.log(`   - Subscription Status: ${updatedUser.subscription.status}`);
        console.log(`   - Subscription Amount: ${updatedUser.subscription.amount} SSP`);
        console.log(`   - Payment Session: ${updatedUser.paymentSession ? 'Still exists' : 'Cleared'}`);
        console.log(`   - Start Date: ${updatedUser.subscription.startDate}`);
        console.log(`   - Expiry Date: ${updatedUser.subscription.expiryDate}`);
        
        // Verification checks
        const checks = [
            { name: 'Stage is subscribed', check: updatedUser.stage === 'subscribed' },
            { name: 'Subscription is active', check: updatedUser.subscription.status === 'active' },
            { name: 'Plan type is weekly', check: updatedUser.subscription.planType === planType },
            { name: 'Amount is correct', check: updatedUser.subscription.amount === sspAmount },
            { name: 'Payment session cleared', check: !updatedUser.paymentSession },
            { name: 'Start date set', check: !!updatedUser.subscription.startDate },
            { name: 'Expiry date set', check: !!updatedUser.subscription.expiryDate }
        ];
        
        console.log('\n✅ Verification Results:');
        let allPassed = true;
        for (const check of checks) {
            const status = check.check ? '✅' : '❌';
            console.log(`   ${status} ${check.name}`);
            if (!check.check) allPassed = false;
        }
        
        if (allPassed) {
            console.log('\n🎊 DIRECT PAYMENT PROCESSING TEST PASSED!');
        } else {
            console.log('\n❌ DIRECT PAYMENT PROCESSING TEST FAILED!');
        }
        
        // Test 2: Test the complete flow with a new user
        console.log('\n🔄 Test 2: Complete Flow Test');
        console.log('-'.repeat(40));
        
        const testUserId2 = 'complete_test_user_' + Date.now();
        const testReference2 = 'COMPLETE_TEST_' + Date.now();
        
        // Clear existing test user
        await User.deleteOne({ messengerId: testUserId2 });
        
        // Create test user with payment session
        const user2 = new User({
            messengerId: testUserId2,
            stage: 'awaiting_payment',
            paymentSession: {
                planType: planType,
                amount: sspAmount,
                startTime: new Date(),
                status: 'pending',
                reference: testReference2
            },
            paymentMobileNumber: '0921234567'
        });
        
        await user2.save();
        console.log('✅ Created second test user');
        
        // Simulate payment callback data
        const callbackData = {
            referenceId: testReference2,
            status: 'SUCCESSFUL',
            amount: paymentAmount,
            currency: currency,
            externalId: 'EXT_' + testReference2,
            payerMessage: 'Payment successful',
            payeeNote: 'Subscription payment'
        };
        
        console.log('📋 Callback Data:');
        console.log(`   - Reference: ${callbackData.referenceId}`);
        console.log(`   - Status: ${callbackData.status}`);
        console.log(`   - Amount: ${callbackData.amount} ${callbackData.currency}`);
        
        // Process the callback (this will fail API verification but we can test the logic)
        try {
            const result2 = await momoService.handlePaymentCallback(callbackData);
            console.log('✅ Callback processed (with API verification failure)');
            console.log(`   - Result:`, result2);
        } catch (error) {
            console.log('⚠️ Callback processing failed (expected due to API verification):');
            console.log(`   - Error: ${error.message}`);
        }
        
        // Check if user was processed despite API failure
        const updatedUser2 = await User.findOne({ messengerId: testUserId2 });
        console.log('\n🔍 User State After Callback (with API failure):');
        console.log(`   - Stage: ${updatedUser2.stage}`);
        console.log(`   - Subscription Status: ${updatedUser2.subscription.status}`);
        console.log(`   - Payment Session: ${updatedUser2.paymentSession ? 'Still exists' : 'Cleared'}`);
        
        // Cleanup
        console.log('\n🧹 Cleaning up test data...');
        await User.deleteOne({ messengerId: testUserId });
        await User.deleteOne({ messengerId: testUserId2 });
        console.log('✅ Test data cleaned up');
        
        console.log('\n🎊 DIRECT PAYMENT PROCESSING TEST COMPLETED!');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('Stack trace:', error.stack);
    } finally {
        await mongoose.connection.close();
        console.log('✅ Database connection closed');
    }
}

// Run the test
testDirectPaymentProcessing();
