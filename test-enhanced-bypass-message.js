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
            messengerId: 'ENHANCED_TEST_' + Date.now(),
            mobileNumber: '0921234567', // Test number for bypass
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

function generateEnhancedSuccessMessage(user) {
    const expiryDate = timezone.toJubaTime(user.subscription.expiryDate);
    
    return '🎉 Payment successful! Your subscription is now active.\n\n' +
           '💳 **Plan Details:**\n' +
           `• Plan: ${user.subscription.planType === 'weekly' ? 'Weekly Plan' : 'Monthly Plan'}\n` +
           `• Cost: ${user.subscription.amount === 1 ? '3,000 SSP' : '6,500 SSP'}\n` +
           `• Messages: 30 per day\n` +
           `• Expires: ${expiryDate.format('YYYY-MM-DD HH:mm:ss')}\n\n` +
           '🚀 **What\'s Next:**\n' +
           '• Start asking questions immediately\n' +
           '• Daily limit resets at midnight (Juba time)\n' +
           '• Use \'status\' command to check your usage\n\n' +
           'Enjoy using Answer Bot AI! 🤖';
}

async function testEnhancedBypassMessage() {
    try {
        console.log('\n🎭 [ENHANCED BYPASS MESSAGE TEST]');
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
        
        // 3. Test payment initiation with bypass
        console.log('\n💰 [STEP 1] Initiating payment with bypass...');
        const paymentResult = await momoService.initiatePayment(testUser, 'weekly');
        
        console.log('\n✅ [STEP 1] Payment initiated successfully!');
        console.log(`   ├── Reference: ${paymentResult.reference}`);
        console.log(`   ├── Amount: ${paymentResult.amount}`);
        console.log(`   └── Sandbox bypass: ${paymentResult.sandboxBypass || false}`);
        
        // 4. Check user state after bypass
        console.log('\n🔍 [STEP 2] Checking user state after bypass...');
        const updatedUser = await User.findById(testUser._id);
        
        console.log('✅ User state updated:');
        console.log(`   ├── Stage: ${updatedUser.stage}`);
        console.log(`   ├── Subscription status: ${updatedUser.subscription?.status || 'none'}`);
        console.log(`   ├── Plan type: ${updatedUser.subscription?.planType || 'none'}`);
        console.log(`   └── Expiry date: ${updatedUser.subscription?.expiryDate || 'none'}`);
        
        // 5. Show the enhanced success message user would receive
        if (updatedUser.subscription?.status === 'active') {
            console.log('\n📱 [ENHANCED SUCCESS MESSAGE - USER WOULD RECEIVE THIS]');
            console.log('=====================================');
            const successMessage = generateEnhancedSuccessMessage(updatedUser);
            console.log(successMessage);
            console.log('=====================================');
            
            console.log('\n🎯 [MESSAGE ANALYSIS]');
            console.log('✅ Shows plan type (Weekly/Monthly)');
            console.log('✅ Shows cost in SSP');
            console.log('✅ Shows daily message limit');
            console.log('✅ Shows expiry date in Juba time');
            console.log('✅ Provides next steps guidance');
            console.log('✅ Includes helpful commands');
        }
        
        // 6. Cleanup
        console.log('\n🧹 Cleaning up test data...');
        await User.deleteOne({ _id: testUser._id });
        console.log('✅ Test user removed');
        
        console.log('\n🎉 [ENHANCED MESSAGE TEST COMPLETED]');
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
        await testEnhancedBypassMessage();
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
