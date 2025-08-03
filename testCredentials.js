// Quick test of MTN MoMo credentials
require('dotenv').config();
const axios = require('axios');

async function testCredentials() {
    const apiUserId = process.env.MOMO_API_USER_ID;
    const apiKey = process.env.MOMO_API_KEY;
    const subscriptionKey = process.env.MOMO_SUBSCRIPTION_KEY;
    
    console.log('Testing credentials:');
    console.log('API User ID:', apiUserId);
    console.log('API Key:', apiKey);
    console.log('Subscription Key:', subscriptionKey);
    console.log('');
    
    const endpoint = 'https://sandbox.momodeveloper.mtn.com/collection/token/';
    const auth = Buffer.from(`${apiUserId}:${apiKey}`).toString('base64');
    
    console.log('Authorization header (Base64):', auth);
    console.log('Decoded:', Buffer.from(auth, 'base64').toString());
    console.log('');
    
    try {
        const response = await axios.post(endpoint, null, {
            headers: {
                'Authorization': `Basic ${auth}`,
                'Ocp-Apim-Subscription-Key': subscriptionKey,
                'Content-Type': 'application/json'
            },
            timeout: 10000
        });
        
        console.log('✅ SUCCESS!');
        console.log('Status:', response.status);
        console.log('Access Token:', response.data.access_token ? 'RECEIVED' : 'MISSING');
        console.log('Expires in:', response.data.expires_in, 'seconds');
        
    } catch (error) {
        console.log('❌ FAILED!');
        console.log('Status:', error.response?.status);
        console.log('Error:', error.response?.data || error.message);
        
        // Additional debugging
        if (error.response?.status === 401) {
            console.log('\n🔍 DEBUGGING 401 ERROR:');
            console.log('- Check if API User exists in MoMo portal');
            console.log('- Verify API Key is correct and not expired');
            console.log('- Ensure Subscription Key is active for Collections API');
            console.log('- Try regenerating the API Key in the portal');
        }
    }
}

testCredentials();
