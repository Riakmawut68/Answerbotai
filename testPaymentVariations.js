// Test different payment request variations for MTN MoMo sandbox
require('dotenv').config();
const MomoService = require('./services/momoService');

async function testPaymentVariations() {
    try {
        process.env.MOMO_ENVIRONMENT = 'sandbox';
        const momoService = new MomoService();
        
        // Test variations
        const variations = [
            {
                name: "SSP Currency (Default)",
                currency: "SSP",
                amount: "100",
                msisdn: "256782181481"
            },
            {
                name: "EUR Currency with decimal",
                currency: "EUR", 
                amount: "100.00",
                msisdn: "256782181481"
            },
            {
                name: "SSP with different MSISDN format",
                currency: "SSP",
                amount: "100",
                msisdn: "782181481" // Without country code
            },
            {
                name: "EUR with standard sandbox number",
                currency: "EUR",
                amount: "100",
                msisdn: "46733123450" // Common sandbox test number
            }
        ];
        
        for (const variation of variations) {
            console.log(`\n=== Testing: ${variation.name} ===`);
            
            // Create test user for this variation
            const testUser = {
                messengerId: 'test123',
                paymentMobileNumber: variation.msisdn,
                stage: 'awaiting_payment',
                subscription: { plan: 'none', status: 'none' },
                save: async () => {}
            };
            
            // Override currency and amount calculation
            momoService.currency = variation.currency;
            momoService.calculatePlanAmount = () => parseFloat(variation.amount);
            
            try {
                const result = await momoService.initiatePayment(testUser, 'test');
                console.log('✅ SUCCESS!');
                console.log('Reference:', result.reference);
                
                // Test payment status check
                console.log('Checking payment status...');
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                try {
                    const status = await momoService.verifyPayment(result.reference);
                    console.log('Payment Status:', status.status);
                    console.log('Success:', status.success);
                } catch (statusError) {
                    console.log('Status Check Error:', statusError.message);
                }
                
                break; // Stop testing if one works
                
            } catch (error) {
                console.log('❌ FAILED');
                console.log('Error:', error.message);
                
                if (error.response) {
                    console.log('Status:', error.response.status);
                    console.log('Response:', error.response.data);
                }
            }
        }
        
    } catch (error) {
        console.log('Test setup error:', error.message);
    }
}

testPaymentVariations();
