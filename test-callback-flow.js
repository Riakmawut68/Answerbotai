const express = require('express');
const axios = require('axios');

// Simulate the callback flow
async function testCallbackFlow() {
    console.log('🔄 Testing Payment Callback Flow...\n');
    
    // Your callback URL
    const callbackUrl = 'https://answerbotai.onrender.com/momo/callback';
    
    // Simulate the callback data that MTN will send
    const mockCallbackData = {
        referenceId: '39ab0ceb-9985-42e7-bbc3-a218180922b0', // Your actual reference
        status: 'SUCCESSFUL',
        amount: 1,
        currency: 'EUR',
        payerMessage: 'Payment successful',
        financialTransactionId: '123456789',
        externalId: '79681f9f-786c-4202-ae8d-c6542ae05897'
    };
    
    console.log('📨 Simulating MTN MoMo callback...');
    console.log('   URL:', callbackUrl);
    console.log('   Data:', JSON.stringify(mockCallbackData, null, 2));
    
    try {
        // Send the callback (simulating MTN's request)
        const response = await axios.post(callbackUrl, mockCallbackData, {
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'MTN-MoMo-API/1.0'
            },
            timeout: 10000
        });
        
        console.log('\n✅ Callback sent successfully!');
        console.log('   Status:', response.status);
        console.log('   Response:', response.data);
        
    } catch (error) {
        console.log('\n❌ Callback failed (expected in test environment):');
        console.log('   Error:', error.message);
        
        if (error.response) {
            console.log('   Status:', error.response.status);
            console.log('   Response:', error.response.data);
        }
    }
    
    console.log('\n📋 Callback Flow Summary:');
    console.log('1. User approves payment on phone');
    console.log('2. MTN sends POST to: https://answerbotai.onrender.com/momo/callback');
    console.log('3. Your server receives callback data');
    console.log('4. Server processes payment and updates user');
    console.log('5. User gets success message via Messenger');
    console.log('6. Logs show: "🎉 PAYMENT SUCCESSFUL"');
}

// Show the callback endpoint code
function showCallbackCode() {
    console.log('\n🔧 Callback Endpoint Code:\n');
    console.log('// Route: POST /momo/callback');
    console.log('app.post(\'/momo/callback\', momoController.handlePaymentCallback);\n');
    
    console.log('// Controller: controllers/momoController.js');
    console.log('handlePaymentCallback: async (req, res) => {');
    console.log('    const { body } = req;');
    console.log('    logger.info(\'💰 Payment callback received:\', body);');
    console.log('    res.status(200).json({ status: \'OK\' });');
    console.log('    const result = await momoService.handlePaymentCallback(body);');
    console.log('    // Send success/failure message to user');
    console.log('}');
}

// Show what happens when callback arrives
function showCallbackProcessing() {
    console.log('\n🔄 Callback Processing Flow:\n');
    console.log('1. MTN sends POST to /momo/callback');
    console.log('2. momoController.handlePaymentCallback() receives it');
    console.log('3. Immediately responds with 200 OK to MTN');
    console.log('4. Processes callback asynchronously');
    console.log('5. Finds user by payment reference');
    console.log('6. Updates user subscription status');
    console.log('7. Sends success message via Messenger');
    console.log('8. Logs: "🎉 PAYMENT SUCCESSFUL"');
}

// Run the demonstration
console.log('🚀 Payment Callback Flow Demonstration\n');
showCallbackCode();
showCallbackProcessing();
testCallbackFlow();
