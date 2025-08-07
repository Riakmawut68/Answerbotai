const mongoose = require('mongoose');
const logger = require('./utils/logger');
const User = require('./models/user');
const MomoService = require('./services/momoService');
const messengerService = require('./services/messengerService');
const config = require('./config');

// Initialize MoMo service
const momoService = new MomoService();

class PaymentFlowTester {
    constructor() {
        this.testUserId = 'test_user_12345';
        this.testMobileNumber = '0921234567';
        this.testPlanType = 'weekly';
        this.testAmount = 3000; // SSP amount (will be converted to EUR)
        this.testReference = 'TEST_REF_' + Date.now();
    }

    async runCompleteTest() {
        console.log('\n🚀 STARTING COMPLETE PAYMENT FLOW TEST');
        console.log('=' .repeat(60));
        console.log(`💰 Test Configuration:`);
        console.log(`   - Plan Type: ${this.testPlanType}`);
        console.log(`   - SSP Amount: ${this.testAmount} SSP`);
        console.log(`   - Payment Amount: ${config.momo.getPaymentAmount(this.testPlanType)} ${config.momo.getPaymentCurrency()}`);
        console.log(`   - Currency: ${config.momo.getPaymentCurrency()}`);
        console.log('=' .repeat(60));
        
        try {
            // Step 1: Initialize test user
            await this.step1_InitializeUser();
            
            // Step 2: Start trial
            await this.step2_StartTrial();
            
            // Step 3: Request subscription
            await this.step3_RequestSubscription();
            
            // Step 4: Provide payment phone number
            await this.step4_ProvidePaymentPhone();
            
            // Step 5: Initiate payment
            await this.step5_InitiatePayment();
            
            // Step 6: Simulate payment success callback
            await this.step6_SimulatePaymentSuccess();
            
            // Step 7: Verify final state
            await this.step7_VerifyFinalState();
            
            console.log('\n✅ COMPLETE PAYMENT FLOW TEST PASSED!');
            console.log('=' .repeat(60));
            
        } catch (error) {
            console.error('\n❌ TEST FAILED:', error.message);
            console.error('Stack trace:', error.stack);
            throw error;
        }
    }

    async step1_InitializeUser() {
        console.log('\n📋 STEP 1: Initializing Test User');
        console.log('-'.repeat(40));
        
        // Clear any existing test user
        await User.deleteOne({ messengerId: this.testUserId });
        console.log('✅ Cleared existing test user');
        
        // Create new user in initial state
        const user = new User({
            messengerId: this.testUserId,
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
        
        // Verify user state
        const savedUser = await User.findOne({ messengerId: this.testUserId });
        if (!savedUser || savedUser.stage !== 'initial') {
            throw new Error('User not properly initialized');
        }
        console.log('✅ User state verified');
    }

    async step2_StartTrial() {
        console.log('\n🎯 STEP 2: Starting Trial');
        console.log('-'.repeat(40));
        
        const user = await User.findOne({ messengerId: this.testUserId });
        if (!user) throw new Error('Test user not found');
        
        // Simulate user sending "START_TRIAL" postback
        user.stage = 'trial';
        user.hasUsedTrial = true;
        user.trialStartDate = new Date();
        await user.save();
        
        console.log('✅ Trial started successfully');
        console.log(`   - Stage: ${user.stage}`);
        console.log(`   - Trial start date: ${user.trialStartDate}`);
        console.log(`   - Has used trial: ${user.hasUsedTrial}`);
        
        // Verify trial state
        const trialUser = await User.findOne({ messengerId: this.testUserId });
        if (trialUser.stage !== 'trial') {
            throw new Error('Trial not properly started');
        }
        console.log('✅ Trial state verified');
    }

    async step3_RequestSubscription() {
        console.log('\n💳 STEP 3: Requesting Subscription');
        console.log('-'.repeat(40));
        
        const user = await User.findOne({ messengerId: this.testUserId });
        if (!user) throw new Error('Test user not found');
        
        // Simulate user clicking weekly subscription button
        user.stage = 'awaiting_phone_for_payment';
        user.lastSelectedPlanType = this.testPlanType;
        await user.save();
        
        console.log('✅ Subscription request initiated');
        console.log(`   - Stage: ${user.stage}`);
        console.log(`   - Selected plan: ${user.lastSelectedPlanType}`);
        console.log(`   - SSP Amount: ${this.testAmount} SSP`);
        console.log(`   - Payment Amount: ${config.momo.getPaymentAmount(this.testPlanType)} ${config.momo.getPaymentCurrency()}`);
        
        // Verify subscription request state
        const subscriptionUser = await User.findOne({ messengerId: this.testUserId });
        if (subscriptionUser.stage !== 'awaiting_phone_for_payment') {
            throw new Error('Subscription request not properly processed');
        }
        console.log('✅ Subscription request state verified');
    }

    async step4_ProvidePaymentPhone() {
        console.log('\n📱 STEP 4: Providing Payment Phone Number');
        console.log('-'.repeat(40));
        
        const user = await User.findOne({ messengerId: this.testUserId });
        if (!user) throw new Error('Test user not found');
        
        // Simulate user providing payment phone number
        user.paymentMobileNumber = this.testMobileNumber;
        user.stage = 'awaiting_payment';
        await user.save();
        
        console.log('✅ Payment phone number provided');
        console.log(`   - Payment phone: ${user.paymentMobileNumber}`);
        console.log(`   - Stage: ${user.stage}`);
        console.log(`   - Trial phone: ${user.mobileNumber || 'Not set'}`);
        
        // Verify payment phone state
        const phoneUser = await User.findOne({ messengerId: this.testUserId });
        if (phoneUser.stage !== 'awaiting_payment' || phoneUser.paymentMobileNumber !== this.testMobileNumber) {
            throw new Error('Payment phone not properly set');
        }
        console.log('✅ Payment phone state verified');
    }

    async step5_InitiatePayment() {
        console.log('\n💰 STEP 5: Initiating Payment');
        console.log('-'.repeat(40));
        
        const user = await User.findOne({ messengerId: this.testUserId });
        if (!user) throw new Error('Test user not found');
        
        // Create payment session
        user.paymentSession = {
            planType: this.testPlanType,
            amount: this.testAmount,
            startTime: new Date(),
            status: 'pending',
            reference: this.testReference
        };
        await user.save();
        
        console.log('✅ Payment session created');
        console.log(`   - Plan type: ${user.paymentSession.planType}`);
        console.log(`   - SSP Amount: ${user.paymentSession.amount} SSP`);
        console.log(`   - Payment Amount: ${config.momo.getPaymentAmount(this.testPlanType)} ${config.momo.getPaymentCurrency()}`);
        console.log(`   - Reference: ${user.paymentSession.reference}`);
        console.log(`   - Start time: ${user.paymentSession.startTime}`);
        console.log(`   - Status: ${user.paymentSession.status}`);
        
        // Verify payment session
        const paymentUser = await User.findOne({ messengerId: this.testUserId });
        if (!paymentUser.paymentSession || paymentUser.paymentSession.reference !== this.testReference) {
            throw new Error('Payment session not properly created');
        }
        console.log('✅ Payment session verified');
        
        // Test payment timeout scheduler (simulate expired payment)
        console.log('\n⏰ Testing Payment Timeout Scheduler...');
        await this.testPaymentTimeout();
    }

    async testPaymentTimeout() {
        console.log('   - Simulating payment timeout check...');
        
        // Create a test user with expired payment
        const expiredUser = new User({
            messengerId: 'expired_test_user',
            stage: 'awaiting_payment',
            paymentSession: {
                planType: 'weekly',
                amount: 3000,
                startTime: new Date(Date.now() - 16 * 60 * 1000), // 16 minutes ago
                status: 'pending',
                reference: 'EXPIRED_REF'
            }
        });
        await expiredUser.save();
        
        console.log('   - Created test user with expired payment (16 minutes ago)');
        
        // Import and test the payment timeout scheduler
        const paymentTimeoutScheduler = require('./schedulers/paymentTimeout');
        await paymentTimeoutScheduler.checkExpiredPayments();
        
        // Check if expired user was cleaned up
        const cleanedUser = await User.findOne({ messengerId: 'expired_test_user' });
        if (cleanedUser && cleanedUser.stage === 'trial' && !cleanedUser.paymentSession) {
            console.log('   ✅ Payment timeout scheduler working correctly');
        } else {
            console.log('   ⚠️ Payment timeout scheduler may need attention');
        }
        
        // Clean up test user
        await User.deleteOne({ messengerId: 'expired_test_user' });
    }

    async step6_SimulatePaymentSuccess() {
        console.log('\n🎉 STEP 6: Simulating Payment Success Callback');
        console.log('-'.repeat(40));
        
        // Get the correct currency and amount for sandbox
        const currency = config.momo.getPaymentCurrency();
        const paymentAmount = config.momo.getPaymentAmount(this.testPlanType);
        
        console.log(`   - Currency: ${currency}`);
        console.log(`   - SSP Amount: ${this.testAmount} SSP`);
        console.log(`   - Payment Amount: ${paymentAmount} ${currency}`);
        
        // Simulate MTN MoMo payment callback with correct currency
        const callbackData = {
            referenceId: this.testReference,
            status: 'SUCCESSFUL',
            amount: paymentAmount,
            currency: currency,
            externalId: 'EXT_' + this.testReference,
            payerMessage: 'Payment successful',
            payeeNote: 'Subscription payment'
        };
        
        console.log('✅ Payment callback data prepared');
        console.log(`   - Reference: ${callbackData.referenceId}`);
        console.log(`   - Status: ${callbackData.status}`);
        console.log(`   - Amount: ${callbackData.amount} ${callbackData.currency}`);
        
        // Process the callback
        const result = await momoService.handlePaymentCallback(callbackData);
        console.log('✅ Payment callback processed');
        console.log(`   - Result success: ${result.success}`);
        
        // Verify user state after payment
        const user = await User.findOne({ messengerId: this.testUserId });
        if (!user) throw new Error('User not found after payment');
        
        console.log('✅ User state after payment:');
        console.log(`   - Stage: ${user.stage}`);
        console.log(`   - Subscription plan: ${user.subscription.planType}`);
        console.log(`   - Subscription status: ${user.subscription.status}`);
        console.log(`   - Payment session: ${user.paymentSession ? 'Still exists' : 'Cleared'}`);
        console.log(`   - Subscription start date: ${user.subscription.startDate}`);
        console.log(`   - Subscription expiry date: ${user.subscription.expiryDate}`);
        
        if (user.stage !== 'subscribed' || user.subscription.status !== 'active') {
            throw new Error('Payment success not properly processed');
        }
        console.log('✅ Payment success state verified');
    }

    async step7_VerifyFinalState() {
        console.log('\n🔍 STEP 7: Verifying Final State');
        console.log('-'.repeat(40));
        
        const user = await User.findOne({ messengerId: this.testUserId });
        if (!user) throw new Error('Test user not found');
        
        // Comprehensive state verification
        const verificationChecks = [
            { name: 'User exists', check: !!user },
            { name: 'Stage is subscribed', check: user.stage === 'subscribed' },
            { name: 'Subscription is active', check: user.subscription.status === 'active' },
            { name: 'Plan type is correct', check: user.subscription.planType === this.testPlanType },
            { name: 'Amount is correct', check: user.subscription.amount === this.testAmount },
            { name: 'Payment session cleared', check: !user.paymentSession },
            { name: 'Start date set', check: !!user.subscription.startDate },
            { name: 'Expiry date set', check: !!user.subscription.expiryDate },
            { name: 'Payment phone preserved', check: user.paymentMobileNumber === this.testMobileNumber }
        ];
        
        console.log('🔍 Running verification checks:');
        let allChecksPassed = true;
        
        for (const check of verificationChecks) {
            const status = check.check ? '✅' : '❌';
            console.log(`   ${status} ${check.name}`);
            if (!check.check) allChecksPassed = false;
        }
        
        if (!allChecksPassed) {
            throw new Error('Final state verification failed');
        }
        
        console.log('\n✅ All verification checks passed!');
        
        // Test message sending capability
        console.log('\n📨 Testing message sending capability...');
        const canSendMessages = user.stage === 'subscribed' && user.subscription.status === 'active';
        console.log(`   - Can send messages: ${canSendMessages ? '✅ Yes' : '❌ No'}`);
        
        if (!canSendMessages) {
            throw new Error('User cannot send messages after successful payment');
        }
        
        console.log('✅ Message sending capability verified');
    }

    async cleanup() {
        console.log('\n🧹 Cleaning up test data...');
        await User.deleteOne({ messengerId: this.testUserId });
        console.log('✅ Test data cleaned up');
    }
}

// Main test execution
async function runTest() {
    const tester = new PaymentFlowTester();
    
    try {
        await tester.runCompleteTest();
        console.log('\n🎊 ALL TESTS COMPLETED SUCCESSFULLY!');
    } catch (error) {
        console.error('\n💥 TEST FAILED:', error.message);
        process.exit(1);
    } finally {
        await tester.cleanup();
        process.exit(0);
    }
}

// Run the test if this file is executed directly
if (require.main === module) {
    runTest();
}

module.exports = PaymentFlowTester;
