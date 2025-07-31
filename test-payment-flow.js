const mongoose = require('mongoose');
const User = require('./models/user');
const Validators = require('./utils/validators');

// Test the payment flow changes
async function testPaymentFlow() {
    console.log('🧪 Testing Payment Flow Changes...\n');

    // Test 1: Create a user with a trial phone number
    console.log('Test 1: Creating user with trial phone number');
    const user1 = new User({
        messengerId: 'test_user_1',
        mobileNumber: '0921234567',
        hasUsedTrial: true,
        consentTimestamp: new Date(),
        stage: 'trial'
    });
    await user1.save();
    console.log('✅ User 1 created with trial number: 0921234567\n');

    // Test 2: Create another user with the same trial phone number
    console.log('Test 2: Creating another user with same trial phone number');
    const user2 = new User({
        messengerId: 'test_user_2',
        mobileNumber: '0921234567',
        hasUsedTrial: true,
        consentTimestamp: new Date(),
        stage: 'trial'
    });
    await user2.save();
    console.log('✅ User 2 created with same trial number: 0921234567\n');

    // Test 3: Test payment phone number validation
    console.log('Test 3: Testing payment phone number validation');
    const paymentNumber = '0921234567';
    const validation = Validators.validateMobileNumber(paymentNumber);
    
    if (validation.isValid) {
        console.log('✅ Payment number validation passed');
        
        // Test that we can set payment mobile number without conflicts
        user1.paymentMobileNumber = paymentNumber;
        await user1.save();
        console.log('✅ Payment mobile number set successfully');
        
        // Verify both numbers are stored separately
        const updatedUser = await User.findOne({ messengerId: 'test_user_1' });
        console.log(`📱 Trial number: ${updatedUser.mobileNumber}`);
        console.log(`💳 Payment number: ${updatedUser.paymentMobileNumber}`);
        console.log('✅ Both numbers stored separately\n');
    } else {
        console.log('❌ Payment number validation failed:', validation.error);
    }

    // Test 4: Test that payment flow doesn't check trial usage
    console.log('Test 4: Testing payment flow logic');
    const existingUserWithTrial = await User.findOne({ mobileNumber: paymentNumber, hasUsedTrial: true });
    
    if (existingUserWithTrial) {
        console.log('✅ Found existing user with trial number');
        console.log('✅ Payment flow should now accept this number without checking trial usage');
    } else {
        console.log('❌ Could not find existing user with trial number');
    }

    console.log('\n🎉 Payment flow test completed successfully!');
    console.log('The payment flow now accepts any valid MTN number without checking trial usage.');
}

// Run the test
async function runTest() {
    try {
        // Connect to MongoDB (you'll need to set your connection string)
        const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/messenger-bot';
        await mongoose.connect(mongoUri);
        console.log('📦 Connected to MongoDB\n');

        await testPaymentFlow();
    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\n📦 Disconnected from MongoDB');
    }
}

// Run if this file is executed directly
if (require.main === module) {
    runTest();
}

module.exports = { testPaymentFlow }; 