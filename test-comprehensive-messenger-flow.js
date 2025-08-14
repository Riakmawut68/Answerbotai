#!/usr/bin/env node

const mongoose = require('mongoose');
const config = require('./config');
const MomoService = require('./services/momoService');
const User = require('./models/user');
const timezone = require('./utils/timezone');

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
            messengerId: 'MESSENGER_TEST_' + Date.now(),
            stage: 'initial',
            consentTimestamp: null,
            mobileNumber: null,
            paymentMobileNumber: null,
            trialMessagesUsedToday: 0,
            dailyMessageCount: 0,
            hasUsedTrial: false,
            subscription: {
                planType: 'none',
                status: 'none'
            }
        });
        
        await testUser.save();
        console.log('✅ Test user created:', testUser.messengerId);
        return testUser;
    } catch (error) {
        console.error('❌ Failed to create test user:', error.message);
        throw error;
    }
}

function simulateMessengerFlow() {
    console.log('\n🤖 [COMPREHENSIVE MESSENGER FLOW SIMULATION]');
    console.log('================================================');
    console.log('This test simulates the complete user experience:');
    console.log('1. User starts bot');
    console.log('2. Accepts terms');
    console.log('3. Enters phone number');
    console.log('4. Gets trial access');
    console.log('5. Reaches trial limit');
    console.log('6. Selects subscription plan');
    console.log('7. Enters payment phone');
    console.log('8. Gets payment processing message');
    console.log('9. Bypass triggers (if test number)');
    console.log('10. Gets premium access');
    console.log('================================================\n');
}

async function simulateUserStart(user) {
    console.log('👤 [USER ACTION] User sends "start"');
    console.log('🤖 [BOT RESPONSE] Welcome message with terms');
    console.log('👤 [USER ACTION] User clicks "I Agree"');
    
    // Simulate accepting terms
    user.consentTimestamp = new Date();
    user.stage = 'awaiting_phone';
    await user.save();
    
    console.log('✅ [SYSTEM] User consent recorded, stage: awaiting_phone');
    console.log('🤖 [BOT RESPONSE] "Please enter your MTN mobile number"');
    console.log('---');
}

async function simulatePhoneEntry(user, phoneNumber) {
    console.log(`👤 [USER ACTION] User enters phone: ${phoneNumber}`);
    
    // Validate phone number
    const isValid = /^092\d{7}$/.test(phoneNumber);
    if (!isValid) {
        console.log('❌ [SYSTEM] Invalid phone number format');
        return false;
    }
    
    // Check if number has been used for trial
    const existingUser = await User.findOne({ mobileNumber: phoneNumber });
    if (existingUser && existingUser.hasUsedTrial) {
        console.log('⚠️ [SYSTEM] Number already used for trial, showing subscription options');
        user.stage = 'awaiting_phone_for_payment';
        await user.save();
        return 'subscription_needed';
    } else {
        // Activate trial
        user.mobileNumber = phoneNumber;
        user.stage = 'trial';
        user.hasUsedTrial = true;
        user.trialStartDate = new Date();
        await user.save();
        
        console.log('✅ [SYSTEM] Trial activated, stage: trial');
        console.log('🤖 [BOT RESPONSE] "Your number registered. You can use 3 trial messages!"');
        console.log('---');
        return 'trial_activated';
    }
}

async function simulateTrialUsage(user, messageCount) {
    console.log(`👤 [USER ACTION] User sends ${messageCount} messages`);
    
    for (let i = 1; i <= messageCount; i++) {
        user.trialMessagesUsedToday = i;
        await user.save();
        
        if (i <= config.limits.trialMessagesPerDay) {
            console.log(`✅ [SYSTEM] Trial message ${i}/3 used`);
            console.log('🤖 [BOT RESPONSE] AI response generated');
        } else {
            console.log(`🛑 [SYSTEM] Trial limit reached (${i}/3)`);
            console.log('🤖 [BOT RESPONSE] "Trial limit reached. Subscribe for premium!"');
            break;
        }
    }
    
    if (user.trialMessagesUsedToday >= config.limits.trialMessagesPerDay) {
        user.stage = 'awaiting_phone_for_payment';
        await user.save();
        console.log('✅ [SYSTEM] User moved to payment stage');
    }
    
    console.log('---');
}

async function simulatePlanSelection(user, planType) {
    console.log(`👤 [USER ACTION] User selects: ${planType} plan`);
    
    user.lastSelectedPlanType = planType;
    await user.save();
    
    console.log(`✅ [SYSTEM] Plan selected: ${planType}`);
    console.log('🤖 [BOT RESPONSE] "Please enter your MTN mobile number for payment"');
    console.log('---');
}

async function simulatePaymentPhoneEntry(user, phoneNumber) {
    console.log(`👤 [USER ACTION] User enters payment phone: ${phoneNumber}`);
    
    // Validate phone number
    const isValid = /^092\d{7}$/.test(phoneNumber);
    if (!isValid) {
        console.log('❌ [SYSTEM] Invalid phone number format');
        return false;
    }
    
    user.paymentMobileNumber = phoneNumber;
    await user.save();
    
    console.log(`✅ [SYSTEM] Payment phone saved: ${phoneNumber}`);
    console.log('🤖 [BOT RESPONSE] "Payment is being processed..."');
    console.log('---');
    return true;
}

async function simulatePaymentInitiation(user, planType) {
    console.log(`💰 [SYSTEM] Initiating payment for ${planType} plan`);
    
    try {
        const momoService = new MomoService();
        const paymentResult = await momoService.initiatePayment(user, planType);
        
        if (paymentResult.success) {
            console.log('✅ [SYSTEM] Payment initiated successfully');
            console.log(`   ├── Reference: ${paymentResult.reference}`);
            console.log(`   ├── Amount: ${paymentResult.amount}`);
            console.log(`   └── Bypass: ${paymentResult.sandboxBypass || false}`);
            
            if (paymentResult.sandboxBypass) {
                console.log('🔓 [SYSTEM] Sandbox bypass triggered!');
                console.log('✅ [SYSTEM] User gets premium access immediately');
                console.log('🤖 [BOT RESPONSE] Enhanced success message with subscription details');
            } else {
                console.log('⏳ [SYSTEM] Waiting for real payment callback');
                console.log('🤖 [BOT RESPONSE] "Payment processing, check your phone"');
            }
            
            return paymentResult;
        } else {
            console.log('❌ [SYSTEM] Payment initiation failed');
            return null;
        }
    } catch (error) {
        console.error('❌ [SYSTEM] Payment error:', error.message);
        return null;
    }
}

async function runComprehensiveTest() {
    try {
        simulateMessengerFlow();
        
        // 1. Create test user
        const testUser = await createTestUser();
        console.log(`👤 Test User: ${testUser.messengerId}`);
        console.log(`🎯 Initial Stage: ${testUser.stage}`);
        console.log('---');
        
        // 2. Simulate user start
        await simulateUserStart(testUser);
        
        // 3. Simulate phone entry (trial)
        const trialResult = await simulatePhoneEntry(testUser, '0928765432');
        if (trialResult === 'subscription_needed') {
            console.log('🔄 [FLOW] User needs subscription, skipping to plan selection');
        } else {
            // 4. Simulate trial usage
            await simulateTrialUsage(testUser, 3);
        }
        
        // 5. Simulate plan selection
        await simulatePlanSelection(testUser, 'weekly');
        
        // 6. Simulate payment phone entry (test number for bypass)
        const paymentPhoneResult = await simulatePaymentPhoneEntry(testUser, '0921234567');
        if (!paymentPhoneResult) {
            console.log('❌ [TEST FAILED] Invalid payment phone number');
            return;
        }
        
        // 7. Simulate payment initiation with bypass
        const paymentResult = await simulatePaymentInitiation(testUser, 'weekly');
        
        // 8. Final verification
        console.log('\n🔍 [FINAL VERIFICATION]');
        console.log('=====================================');
        const finalUser = await User.findById(testUser._id);
        
        console.log('✅ Final User State:');
        console.log(`   ├── Stage: ${finalUser.stage}`);
        console.log(`   ├── Mobile: ${finalUser.mobileNumber}`);
        console.log(`   ├── Payment Mobile: ${finalUser.paymentMobileNumber}`);
        console.log(`   ├── Trial Used: ${finalUser.hasUsedTrial}`);
        console.log(`   ├── Subscription: ${finalUser.subscription?.status || 'none'}`);
        console.log(`   └── Plan: ${finalUser.subscription?.planType || 'none'}`);
        
        if (finalUser.stage === 'subscribed') {
            console.log('\n🎉 [TEST SUCCESS] Complete Messenger flow working perfectly!');
            console.log('✅ User went through complete flow and got premium access');
        } else {
            console.log('\n⚠️ [TEST PARTIAL] Flow completed but user not subscribed');
            console.log('Check bypass completion logic');
        }
        
        // 9. Cleanup
        console.log('\n🧹 Cleaning up test data...');
        await User.deleteOne({ _id: testUser._id });
        console.log('✅ Test user removed');
        
        console.log('\n🎉 [COMPREHENSIVE TEST COMPLETED]');
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
        await runComprehensiveTest();
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
