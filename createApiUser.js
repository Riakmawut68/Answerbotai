// Script to create a new MTN MoMo API User for sandbox testing
require('dotenv').config();
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

async function createApiUser() {
    try {
        // Generate a new UUID for the API User
        const newApiUserId = uuidv4();
        console.log('Generated new API User ID:', newApiUserId);
        
        // Create API User
        const createUserEndpoint = 'https://sandbox.momodeveloper.mtn.com/v1_0/apiuser';
        const callbackHost = process.env.CALLBACK_HOST || 'https://answerbotai.onrender.com';
        
        console.log('Creating API User with callback host:', callbackHost);
        
        const createResponse = await axios.post(createUserEndpoint, {
            providerCallbackHost: callbackHost
        }, {
            headers: {
                'X-Reference-Id': newApiUserId,
                'Ocp-Apim-Subscription-Key': process.env.MOMO_SUBSCRIPTION_KEY,
                'Content-Type': 'application/json'
            },
            timeout: 15000
        });
        
        if (createResponse.status === 201) {
            console.log('✅ API User created successfully');
            
            // Wait a moment for the user to be fully created
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Generate API Key
            const keyEndpoint = `https://sandbox.momodeveloper.mtn.com/v1_0/apiuser/${newApiUserId}/apikey`;
            
            console.log('Generating API Key...');
            
            const keyResponse = await axios.post(keyEndpoint, {}, {
                headers: {
                    'Ocp-Apim-Subscription-Key': process.env.MOMO_SUBSCRIPTION_KEY,
                    'Content-Type': 'application/json'
                },
                timeout: 15000
            });
            
            if (keyResponse.status === 201 && keyResponse.data.apiKey) {
                console.log('✅ API Key generated successfully');
                console.log('\n=== UPDATE YOUR .ENV FILE ===');
                console.log(`MOMO_API_USER_ID=${newApiUserId}`);
                console.log(`MOMO_API_KEY=${keyResponse.data.apiKey}`);
                console.log('===============================\n');
                
                // Test the new credentials
                console.log('Testing new credentials...');
                await testCredentials(newApiUserId, keyResponse.data.apiKey);
                
            } else {
                console.error('❌ Failed to generate API Key');
                console.error('Response:', keyResponse.data);
            }
            
        } else {
            console.error('❌ Failed to create API User');
            console.error('Status:', createResponse.status);
            console.error('Response:', createResponse.data);
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Response:', error.response.data);
        }
    }
}

async function testCredentials(apiUserId, apiKey) {
    try {
        const endpoint = 'https://sandbox.momodeveloper.mtn.com/collection/token/';
        const auth = Buffer.from(`${apiUserId}:${apiKey}`).toString('base64');
        
        const response = await axios.post(endpoint, null, {
            headers: {
                'Authorization': `Basic ${auth}`,
                'Ocp-Apim-Subscription-Key': process.env.MOMO_SUBSCRIPTION_KEY,
                'Content-Type': 'application/json'
            },
            timeout: 10000
        });
        
        if (response.status === 200 && response.data.access_token) {
            console.log('✅ Credentials test PASSED - Access token obtained');
            console.log('Token expires in:', response.data.expires_in, 'seconds');
        } else {
            console.log('❌ Credentials test FAILED - No access token');
        }
        
    } catch (error) {
        console.error('❌ Credentials test FAILED:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Response:', error.response.data);
        }
    }
}

// Run the script
createApiUser();
