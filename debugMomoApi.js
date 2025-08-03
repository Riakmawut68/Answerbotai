// Comprehensive MTN MoMo API debugging script
require('dotenv').config();
const axios = require('axios');

async function debugMomoApi() {
    const apiUserId = process.env.MOMO_API_USER_ID;
    const apiKey = process.env.MOMO_API_KEY;
    const subscriptionKey = process.env.MOMO_SUBSCRIPTION_KEY;
    
    console.log('=== MTN MoMo API Debug Report ===\n');
    
    // 1. Check API User exists
    console.log('1. Checking if API User exists...');
    try {
        const getUserEndpoint = `https://sandbox.momodeveloper.mtn.com/v1_0/apiuser/${apiUserId}`;
        const getUserResponse = await axios.get(getUserEndpoint, {
            headers: {
                'Ocp-Apim-Subscription-Key': subscriptionKey,
                'Content-Type': 'application/json'
            },
            timeout: 10000
        });
        
        console.log('✅ API User exists');
        console.log('Provider Callback Host:', getUserResponse.data.providerCallbackHost);
        console.log('Target Environment:', getUserResponse.data.targetEnvironment);
        
    } catch (error) {
        console.log('❌ API User check failed');
        console.log('Status:', error.response?.status);
        console.log('Error:', error.response?.data || error.message);
        
        if (error.response?.status === 404) {
            console.log('🔍 API User does not exist - need to create a new one');
            return;
        }
    }
    
    console.log('\n2. Testing access token generation...');
    
    // 2. Test different approaches
    const approaches = [
        {
            name: 'Standard approach',
            headers: {
                'Authorization': `Basic ${Buffer.from(`${apiUserId}:${apiKey}`).toString('base64')}`,
                'Ocp-Apim-Subscription-Key': subscriptionKey,
                'Content-Type': 'application/json'
            }
        },
        {
            name: 'Without Content-Type',
            headers: {
                'Authorization': `Basic ${Buffer.from(`${apiUserId}:${apiKey}`).toString('base64')}`,
                'Ocp-Apim-Subscription-Key': subscriptionKey
            }
        },
        {
            name: 'With X-Target-Environment',
            headers: {
                'Authorization': `Basic ${Buffer.from(`${apiUserId}:${apiKey}`).toString('base64')}`,
                'Ocp-Apim-Subscription-Key': subscriptionKey,
                'Content-Type': 'application/json',
                'X-Target-Environment': 'sandbox'
            }
        }
    ];
    
    const endpoint = 'https://sandbox.momodeveloper.mtn.com/collection/token/';
    
    for (const approach of approaches) {
        console.log(`\nTesting: ${approach.name}`);
        try {
            const response = await axios.post(endpoint, null, {
                headers: approach.headers,
                timeout: 10000
            });
            
            console.log('✅ SUCCESS!');
            console.log('Status:', response.status);
            console.log('Access Token:', response.data.access_token ? 'RECEIVED' : 'MISSING');
            console.log('Expires in:', response.data.expires_in, 'seconds');
            break; // Stop testing if one works
            
        } catch (error) {
            console.log('❌ FAILED');
            console.log('Status:', error.response?.status);
            console.log('Error:', error.response?.data || error.message);
        }
    }
    
    console.log('\n3. Subscription Key validation...');
    
    // 3. Test subscription key with a simple API call
    try {
        const testEndpoint = 'https://sandbox.momodeveloper.mtn.com/v1_0/apiuser';
        const testResponse = await axios.get(testEndpoint, {
            headers: {
                'Ocp-Apim-Subscription-Key': subscriptionKey,
                'Content-Type': 'application/json'
            },
            timeout: 10000
        });
        
        console.log('✅ Subscription Key is valid');
        console.log('Available API Users:', testResponse.data?.length || 'Unknown');
        
    } catch (error) {
        console.log('❌ Subscription Key test failed');
        console.log('Status:', error.response?.status);
        console.log('Error:', error.response?.data || error.message);
        
        if (error.response?.status === 401) {
            console.log('🔍 Subscription Key might be invalid or expired');
        }
    }
    
    console.log('\n=== Debug Report Complete ===');
    console.log('\nNext Steps:');
    console.log('1. If API User doesn\'t exist, create a new one');
    console.log('2. If Subscription Key is invalid, check MoMo portal');
    console.log('3. If all else fails, try creating completely fresh credentials');
}

debugMomoApi();
