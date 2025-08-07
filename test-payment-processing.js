require('dotenv').config();
const mongoose = require('mongoose');
const config = require('./config');
const logger = require('./utils/logger');
const User = require('./models/user');
const MomoService = require('./services/momoService');

async function testPaymentProcessing() {
    console.log('\n🧪 PAYMENT PROCESSING TEST (EUR/Sandbox)');
    console.log('=' .repeat(50));
    
    try {
        // Connect to database
        await mongoose.connect(config.database.uri, config.database.options);
        console.log('✅ Connected to database');
        
        // Initialize MoMo service
        const momoService = new MomoService();
        
        // Test data
        const testUserId = 'eur_test_user';
        const testReference = 'EUR_TEST_' + Date.now();
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
        
        // Simulate payment success callback
        console.log('\n🎉 Simulating Payment Success Callback...');
        
        const callbackData = {
            referenceId: testReference,
            status: 'SUCCESSFUL',
            amount: paymentAmount, // Use the converted amount
            currency: currency,
            externalId: 'EXT_' + testReference,
            payerMessage: 'Payment successful',
            payeeNote: 'Subscription payment'
        };
        
        console.log('📋 Callback Data:');
        console.log(`   - Reference: ${callbackData.referenceId}`);
        console.log(`   - Status: ${callbackData.status}`);
        console.log(`   - Amount: ${callbackData.amount} ${callbackData.currency}`);
        
        // Process the callback
        const result = await momoService.handlePaymentCallback(callbackData);
        console.log('✅ Payment callback processed');
        console.log(`   - Result:`, result);
        
        // Verify user state
        const updatedUser = await User.findOne({ messengerId: testUserId });
        console.log('\n🔍 User State After Payment:');
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
            console.log('\n🎊 PAYMENT PROCESSING TEST PASSED!');
        } else {
            console.log('\n❌ PAYMENT PROCESSING TEST FAILED!');
        }
        
        // Cleanup
        await User.deleteOne({ messengerId: testUserId });
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
testPaymentProcessing();
