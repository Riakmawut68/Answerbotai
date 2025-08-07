require('dotenv').config();
const mongoose = require('mongoose');
const logger = require('./utils/logger');
const User = require('./models/user');
const config = require('./config');

async function testPaymentSessionClearFix() {
    console.log('\n🧪 PAYMENT SESSION CLEAR FIX TEST');
    console.log('=' .repeat(50));
    
    try {
        // Connect to database
        await mongoose.connect(config.database.uri, config.database.options);
        console.log('✅ Connected to database');
        
        // Test data
        const testUserId = 'clear_fix_test_user_' + Date.now();
        
        // Clear existing test user
        await User.deleteOne({ messengerId: testUserId });
        
        // Create test user with payment session
        const user = new User({
            messengerId: testUserId,
            stage: 'awaiting_payment',
            paymentSession: {
                planType: 'weekly',
                amount: 3000,
                startTime: new Date(),
                status: 'pending',
                reference: 'CLEAR_FIX_TEST_' + Date.now()
            }
        });
        
        await user.save();
        console.log('✅ Created test user with payment session');
        console.log(`   - Payment session exists: ${!!user.paymentSession}`);
        
        // Test different methods of clearing paymentSession
        
        // Method 1: Set to null
        console.log('\n🔧 Method 1: Set to null');
        console.log('-'.repeat(30));
        user.paymentSession = null;
        await user.save();
        const userAfterNull = await User.findOne({ messengerId: testUserId });
        console.log(`   - Payment session after null: ${userAfterNull.paymentSession ? 'Still exists' : 'Cleared'}`);
        
        // Method 2: Set to undefined
        console.log('\n🔧 Method 2: Set to undefined');
        console.log('-'.repeat(30));
        user.paymentSession = undefined;
        await user.save();
        const userAfterUndefined = await User.findOne({ messengerId: testUserId });
        console.log(`   - Payment session after undefined: ${userAfterUndefined.paymentSession ? 'Still exists' : 'Cleared'}`);
        
        // Method 3: Use $unset operator
        console.log('\n🔧 Method 3: Use $unset operator');
        console.log('-'.repeat(30));
        await User.updateOne(
            { messengerId: testUserId },
            { $unset: { paymentSession: "" } }
        );
        const userAfterUnset = await User.findOne({ messengerId: testUserId });
        console.log(`   - Payment session after $unset: ${userAfterUnset.paymentSession ? 'Still exists' : 'Cleared'}`);
        
        // Method 4: Set to empty object
        console.log('\n🔧 Method 4: Set to empty object');
        console.log('-'.repeat(30));
        user.paymentSession = {};
        await user.save();
        const userAfterEmpty = await User.findOne({ messengerId: testUserId });
        console.log(`   - Payment session after empty object: ${userAfterEmpty.paymentSession ? 'Still exists' : 'Cleared'}`);
        console.log(`   - Payment session content:`, userAfterEmpty.paymentSession);
        
        // Method 5: Use $set with null
        console.log('\n🔧 Method 5: Use $set with null');
        console.log('-'.repeat(30));
        await User.updateOne(
            { messengerId: testUserId },
            { $set: { paymentSession: null } }
        );
        const userAfterSetNull = await User.findOne({ messengerId: testUserId });
        console.log(`   - Payment session after $set null: ${userAfterSetNull.paymentSession ? 'Still exists' : 'Cleared'}`);
        
        // Method 6: Use $unset and then set to null
        console.log('\n🔧 Method 6: Use $unset and then set to null');
        console.log('-'.repeat(30));
        await User.updateOne(
            { messengerId: testUserId },
            { $unset: { paymentSession: "" } }
        );
        await User.updateOne(
            { messengerId: testUserId },
            { $set: { paymentSession: null } }
        );
        const userAfterUnsetSetNull = await User.findOne({ messengerId: testUserId });
        console.log(`   - Payment session after unset + set null: ${userAfterUnsetSetNull.paymentSession ? 'Still exists' : 'Cleared'}`);
        
        // Method 7: Use findOneAndUpdate with $unset
        console.log('\n🔧 Method 7: Use findOneAndUpdate with $unset');
        console.log('-'.repeat(30));
        await User.findOneAndUpdate(
            { messengerId: testUserId },
            { $unset: { paymentSession: "" } },
            { new: true }
        );
        const userAfterFindOneAndUpdate = await User.findOne({ messengerId: testUserId });
        console.log(`   - Payment session after findOneAndUpdate: ${userAfterFindOneAndUpdate.paymentSession ? 'Still exists' : 'Cleared'}`);
        
        // Summary
        console.log('\n📊 SUMMARY');
        console.log('-'.repeat(30));
        console.log(`✅ Method 1 (null): ${userAfterNull.paymentSession ? 'FAILED' : 'SUCCESS'}`);
        console.log(`✅ Method 2 (undefined): ${userAfterUndefined.paymentSession ? 'FAILED' : 'SUCCESS'}`);
        console.log(`✅ Method 3 ($unset): ${userAfterUnset.paymentSession ? 'FAILED' : 'SUCCESS'}`);
        console.log(`✅ Method 4 (empty object): ${userAfterEmpty.paymentSession ? 'FAILED' : 'SUCCESS'}`);
        console.log(`✅ Method 5 ($set null): ${userAfterSetNull.paymentSession ? 'FAILED' : 'SUCCESS'}`);
        console.log(`✅ Method 6 (unset + set null): ${userAfterUnsetSetNull.paymentSession ? 'FAILED' : 'SUCCESS'}`);
        console.log(`✅ Method 7 (findOneAndUpdate): ${userAfterFindOneAndUpdate.paymentSession ? 'FAILED' : 'SUCCESS'}`);
        
        // Cleanup
        console.log('\n🧹 Cleaning up test data...');
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
testPaymentSessionClearFix();
