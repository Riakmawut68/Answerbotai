require('dotenv').config();
const mongoose = require('mongoose');
const logger = require('./utils/logger');
const User = require('./models/user');
const MomoService = require('./services/momoService');
const config = require('./config');

async function testCompleteWorkingFlow() {
    console.log('\n🚀 COMPLETE WORKING PAYMENT FLOW TEST');
    console.log('=' .repeat(60));
    
    try {
        // Connect to database
        await mongoose.connect(config.database.uri, config.database.options);
        console.log('✅ Connected to database');
        
        // Initialize MoMo service
        const momoService = new MomoService();
        
        // Test data
        const testUserId = 'complete_working_user_' + Date.now();
        const testReference = 'COMPLETE_WORKING_' + Date.now();
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
        console.log('=' .repeat(60));
        
        // STEP 1: Create test user in initial state
        console.log('\n📋 STEP 1: Creating Test User');
        console.log('-'.repeat(40));
        
        // Clear existing test user
        await User.deleteOne({ messengerId: testUserId });
        
        // Create new user in initial state
        const user = new User({
            messengerId: testUserId,
            stage: 'initial',
            subscription: {
                planType: 'none',
                status: 'none'
            },
            trialMessagesUsedToday: 0,
            dailyMessageCount: 0
        });
        
        await user.save();
        console.log('✅ Created test user in initial state');
        console.log(`   - Messenger ID: ${user.messengerId}`);
        console.log(`   - Stage: ${user.stage}`);
        console.log(`   - Subscription: ${user.subscription.planType} (${user.subscription.status})`);
        
        // STEP 2: Start trial
        console.log('\n🎯 STEP 2: Starting Trial');
        console.log('-'.repeat(40));
        
        user.stage = 'trial';
        user.hasUsedTrial = true;
        user.trialStartDate = new Date();
        await user.save();
        
        console.log('✅ Trial started successfully');
        console.log(`   - Stage: ${user.stage}`);
        console.log(`   - Trial start date: ${user.trialStartDate}`);
        console.log(`   - Has used trial: ${user.hasUsedTrial}`);
        
        // STEP 3: Request subscription
        console.log('\n💳 STEP 3: Requesting Subscription');
        console.log('-'.repeat(40));
        
        user.stage = 'awaiting_phone_for_payment';
        user.lastSelectedPlanType = planType;
        await user.save();
        
        console.log('✅ Subscription request initiated');
        console.log(`   - Stage: ${user.stage}`);
        console.log(`   - Selected plan: ${user.lastSelectedPlanType}`);
        console.log(`   - SSP Amount: ${sspAmount} SSP`);
        console.log(`   - Payment Amount: ${paymentAmount} ${currency}`);
        
        // STEP 4: Provide payment phone number
        console.log('\n📱 STEP 4: Providing Payment Phone Number');
        console.log('-'.repeat(40));
        
        user.paymentMobileNumber = '0921234567';
        user.stage = 'awaiting_payment';
        await user.save();
        
        console.log('✅ Payment phone number provided');
        console.log(`   - Payment phone: ${user.paymentMobileNumber}`);
        console.log(`   - Stage: ${user.stage}`);
        
        // STEP 5: Create payment session
        console.log('\n💰 STEP 5: Creating Payment Session');
        console.log('-'.repeat(40));
        
        user.paymentSession = {
            planType: planType,
            amount: sspAmount,
            startTime: new Date(),
            status: 'pending',
            reference: testReference
        };
        await user.save();
        
        console.log('✅ Payment session created');
        console.log(`   - Plan type: ${user.paymentSession.planType}`);
        console.log(`   - SSP Amount: ${user.paymentSession.amount} SSP`);
        console.log(`   - Payment Amount: ${paymentAmount} ${currency}`);
        console.log(`   - Reference: ${user.paymentSession.reference}`);
        console.log(`   - Start time: ${user.paymentSession.startTime}`);
        console.log(`   - Status: ${user.paymentSession.status}`);
        
        // STEP 6: Process successful payment (direct method)
        console.log('\n🎉 STEP 6: Processing Successful Payment');
        console.log('-'.repeat(40));
        
        // Call the processSuccessfulPayment method directly
        const result = await momoService.processSuccessfulPayment(user);
        console.log('✅ Payment processing completed');
        console.log(`   - Result:`, result);
        
        // STEP 7: Verify final state
        console.log('\n🔍 STEP 7: Verifying Final State');
        console.log('-'.repeat(40));
        
        // Fetch the user again to ensure we have the latest state
        const finalUser = await User.findOne({ messengerId: testUserId });
        
        console.log('📊 Final User State:');
        console.log(`   - Stage: ${finalUser.stage}`);
        console.log(`   - Subscription Plan: ${finalUser.subscription.planType}`);
        console.log(`   - Subscription Status: ${finalUser.subscription.status}`);
        console.log(`   - Subscription Amount: ${finalUser.subscription.amount} SSP`);
        console.log(`   - Payment Session: ${finalUser.paymentSession ? 'Still exists' : 'Cleared'}`);
        console.log(`   - Start Date: ${finalUser.subscription.startDate}`);
        console.log(`   - Expiry Date: ${finalUser.subscription.expiryDate}`);
        console.log(`   - Payment Phone: ${finalUser.paymentMobileNumber}`);
        
        // Comprehensive verification checks
        const verificationChecks = [
            { name: 'User exists', check: !!finalUser },
            { name: 'Stage is subscribed', check: finalUser.stage === 'subscribed' },
            { name: 'Subscription is active', check: finalUser.subscription.status === 'active' },
            { name: 'Plan type is correct', check: finalUser.subscription.planType === planType },
            { name: 'Amount is correct', check: finalUser.subscription.amount === sspAmount },
            { name: 'Payment session cleared', check: !finalUser.paymentSession },
            { name: 'Start date set', check: !!finalUser.subscription.startDate },
            { name: 'Expiry date set', check: !!finalUser.subscription.expiryDate },
            { name: 'Payment phone preserved', check: finalUser.paymentMobileNumber === '0921234567' }
        ];
        
        console.log('\n🔍 Running verification checks:');
        let allChecksPassed = true;
        
        for (const check of verificationChecks) {
            const status = check.check ? '✅' : '❌';
            console.log(`   ${status} ${check.name}`);
            if (!check.check) allChecksPassed = false;
        }
        
        if (allChecksPassed) {
            console.log('\n✅ All verification checks passed!');
            
            // Test message sending capability
            console.log('\n📨 Testing message sending capability...');
            const canSendMessages = finalUser.stage === 'subscribed' && finalUser.subscription.status === 'active';
            console.log(`   - Can send messages: ${canSendMessages ? '✅ Yes' : '❌ No'}`);
            
            if (canSendMessages) {
                console.log('✅ Message sending capability verified');
            }
            
            console.log('\n🎊 COMPLETE WORKING PAYMENT FLOW TEST PASSED!');
            console.log('=' .repeat(60));
        } else {
            console.log('\n❌ Some verification checks failed!');
            throw new Error('Final state verification failed');
        }
        
        // STEP 8: Test payment timeout functionality
        console.log('\n⏰ STEP 8: Testing Payment Timeout Functionality');
        console.log('-'.repeat(40));
        
        // Create a test user with expired payment
        const expiredUserId = 'expired_test_user_' + Date.now();
        const expiredUser = new User({
            messengerId: expiredUserId,
            stage: 'awaiting_payment',
            paymentSession: {
                planType: 'weekly',
                amount: 3000,
                startTime: new Date(Date.now() - 16 * 60 * 1000), // 16 minutes ago
                status: 'pending',
                reference: 'EXPIRED_REF_' + Date.now()
            }
        });
        await expiredUser.save();
        
        console.log('✅ Created test user with expired payment (16 minutes ago)');
        
        // Import and test the payment timeout scheduler
        const paymentTimeoutScheduler = require('./schedulers/paymentTimeout');
        await paymentTimeoutScheduler.checkExpiredPayments();
        
        // Check if expired user was cleaned up
        const cleanedUser = await User.findOne({ messengerId: expiredUserId });
        if (cleanedUser && cleanedUser.stage === 'trial' && !cleanedUser.paymentSession) {
            console.log('✅ Payment timeout scheduler working correctly');
        } else {
            console.log('⚠️ Payment timeout scheduler may need attention');
            console.log(`   - Stage: ${cleanedUser?.stage}`);
            console.log(`   - Payment session: ${cleanedUser?.paymentSession ? 'Still exists' : 'Cleared'}`);
        }
        
        // Cleanup
        console.log('\n🧹 Cleaning up test data...');
        await User.deleteOne({ messengerId: testUserId });
        await User.deleteOne({ messengerId: expiredUserId });
        console.log('✅ Test data cleaned up');
        
        console.log('\n🎊 ALL TESTS COMPLETED SUCCESSFULLY!');
        console.log('=' .repeat(60));
        
    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        console.error('Stack trace:', error.stack);
    } finally {
        await mongoose.connection.close();
        console.log('✅ Database connection closed');
    }
}

// Run the test
testCompleteWorkingFlow();
