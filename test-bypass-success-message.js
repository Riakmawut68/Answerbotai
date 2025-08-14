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

async function testBypassSuccessMessage() {
    try {
        console.log('🔓 [TESTING BYPASS SUCCESS MESSAGE]');
        console.log('=====================================');
        
        // Create test user
        const testUser = new User({
            messengerId: 'BYPASS_TEST_' + Date.now(),
            stage: 'awaiting_payment',
            paymentMobileNumber: '0921234567',
            paymentSession: {
                planType: 'weekly',
                amount: 1,
                startTime: new Date(),
                status: 'pending',
                reference: 'test-reference-' + Date.now()
            }
        });
        
        await testUser.save();
        console.log('✅ Test user created:', testUser.messengerId);
        
        // Test the bypass flow
        const momoService = new MomoService();
        
        console.log('\n💰 [INITIATING BYPASS PAYMENT]');
        const paymentResult = await momoService.initiatePayment(testUser, 'weekly');
        
        if (paymentResult.success && paymentResult.sandboxBypass) {
            console.log('✅ [BYPASS SUCCESS] Payment bypassed successfully');
            
            // Check if user got the success message
            const updatedUser = await User.findById(testUser._id);
            console.log('\n🔍 [USER STATE AFTER BYPASS]');
            console.log(`   ├── Stage: ${updatedUser.stage}`);
            console.log(`   ├── Subscription: ${updatedUser.subscription?.status || 'none'}`);
            console.log(`   └── Plan: ${updatedUser.subscription?.planType || 'none'}`);
            
            if (updatedUser.stage === 'subscribed') {
                console.log('\n🎉 [TEST SUCCESS] User got premium access!');
                console.log('✅ Bypass completed and user is subscribed');
                console.log('✅ Success message should have been sent to user');
            } else {
                console.log('\n⚠️ [TEST PARTIAL] User not subscribed after bypass');
            }
        } else {
            console.log('❌ [TEST FAILED] Bypass did not trigger');
        }
        
        // Cleanup
        await User.deleteOne({ _id: testUser._id });
        console.log('\n🧹 Test user cleaned up');
        
    } catch (error) {
        console.error('❌ [TEST ERROR]', error.message);
        console.error(error.stack);
    }
}

async function main() {
    try {
        await connectDB();
        await testBypassSuccessMessage();
    } catch (error) {
        console.error('Main error:', error.message);
    } finally {
        await mongoose.connection.close();
        console.log('\n🔌 Database connection closed');
        process.exit(0);
    }
}

main().catch(async (error) => {
    console.error('Fatal error:', error.message);
    await mongoose.connection.close();
    process.exit(1);
});
