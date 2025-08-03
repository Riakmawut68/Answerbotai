require('dotenv').config();
const MomoService = require('./services/momoService');
const logger = require('./utils/logger');

async function testPaymentIntegration() {
    console.log('🧪 Testing Payment Integration with Main Application Code...\n');

    try {
        // Initialize the MomoService (same as used in main app)
        const momoService = new MomoService();
        
        console.log('✅ MomoService initialized successfully');
        
        // Test connection
        console.log('\n🔐 Testing connection...');
        const connectionTest = await momoService.testConnection();
        
        if (connectionTest.success) {
            console.log('✅ Connection test passed');
        } else {
            console.log('❌ Connection test failed:', connectionTest.error);
            return;
        }

        // Test payment initiation with mock user
        console.log('\n💳 Testing payment initiation...');
        const mockUser = {
            messengerId: 'test-user-123',
            paymentMobileNumber: '256770000000', // Test phone number
            save: async () => console.log('   Mock user saved')
        };

        const paymentResult = await momoService.initiatePayment(mockUser, 'weekly');
        
        if (paymentResult.success) {
            console.log('✅ Payment initiation successful!');
            console.log(`   Reference: ${paymentResult.reference}`);
            console.log(`   Amount: ${paymentResult.amount}`);
            console.log(`   Plan: ${paymentResult.planType}`);
            
            // Test payment status check
            console.log('\n📊 Testing payment status check...');
            const statusResult = await momoService.checkPaymentStatus(paymentResult.reference);
            
            if (statusResult.success) {
                console.log('✅ Payment status check successful!');
                console.log(`   Status: ${statusResult.status}`);
            } else {
                console.log('⚠️ Payment status check failed:', statusResult.error);
            }
            
        } else {
            console.log('❌ Payment initiation failed:', paymentResult.error);
        }

        // Test diagnostics
        console.log('\n🔍 Running diagnostics...');
        const diagnostics = await momoService.diagnose();
        
        console.log('📋 Diagnostic Results:');
        console.log(`   Overall Status: ${diagnostics.overallStatus}`);
        console.log(`   API User Exists: ${diagnostics.apiUserExists}`);
        console.log(`   Authentication Works: ${diagnostics.authenticationWorks}`);
        
        if (diagnostics.errors && diagnostics.errors.length > 0) {
            console.log('   Errors:');
            diagnostics.errors.forEach(error => console.log(`     - ${error}`));
        }

        console.log('\n🎉 Integration test completed!');
        console.log('💡 If all tests passed, your payment integration is ready for production!');

    } catch (error) {
        console.error('❌ Integration test failed:', error.message);
        logger.error('Payment integration test failed', { error: error.message });
    }
}

// Run the test
testPaymentIntegration().catch(console.error); 