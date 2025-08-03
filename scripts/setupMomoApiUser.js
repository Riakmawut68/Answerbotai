require('dotenv').config();
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');

async function setupMomoApiUser() {
    try {
        console.log('🚀 Setting up MTN MoMo API User...\n');
        
        // Generate a new UUID for the API User
        const newApiUserId = uuidv4();
        console.log(`📝 Generated new API User ID: ${newApiUserId}`);
        
        // Extract callback host from config
        const callbackHost = new URL(config.momo.callbackHost).hostname;
        console.log(`🌐 Using callback host: ${callbackHost}`);
        
        // Create API User
        console.log('\n📡 Creating API User...');
        const createResponse = await axios.post(
            `${config.momo.baseUrl}/v1_0/apiuser`,
            { providerCallbackHost: callbackHost },
            {
                headers: {
                    'X-Reference-Id': newApiUserId,
                    'Ocp-Apim-Subscription-Key': config.momo.subscriptionKey,
                    'Content-Type': 'application/json'
                },
                timeout: 15000
            }
        );
        
        if (createResponse.status === 201) {
            console.log('✅ API User created successfully');
            
            // Wait for the user to be fully created
            console.log('⏳ Waiting for API User to be fully created...');
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Generate API Key
            console.log('🔑 Generating API Key...');
            const keyResponse = await axios.post(
                `${config.momo.baseUrl}/v1_0/apiuser/${newApiUserId}/apikey`,
                {},
                {
                    headers: {
                        'Ocp-Apim-Subscription-Key': config.momo.subscriptionKey,
                        'Content-Type': 'application/json'
                    },
                    timeout: 15000
                }
            );
            
            if (keyResponse.status === 201 && keyResponse.data.apiKey) {
                const apiKey = keyResponse.data.apiKey;
                console.log('✅ API Key generated successfully');
                
                // Test the new credentials
                console.log('\n🧪 Testing new credentials...');
                const testResult = await testCredentials(newApiUserId, apiKey);
                
                if (testResult.success) {
                    console.log('\n🎉 Setup completed successfully!');
                    console.log('\n=== UPDATE YOUR .ENV FILE WITH THESE VALUES ===');
                    console.log(`MOMO_API_USER_ID=${newApiUserId}`);
                    console.log(`MOMO_API_KEY=${apiKey}`);
                    console.log('==============================================\n');
                    
                    console.log('💡 Next steps:');
                    console.log('1. Update your .env file with the values above');
                    console.log('2. Restart your application');
                    console.log('3. Test the integration using the health check endpoint');
                } else {
                    console.log('⚠️ Setup completed but credentials test failed');
                    console.log('You may need to wait a few minutes before the credentials become active');
                }
                
            } else {
                throw new Error('Failed to generate API Key');
            }
            
        } else {
            throw new Error(`Failed to create API User: ${createResponse.status}`);
        }
        
    } catch (error) {
        console.error('\n❌ Setup failed:', error.message);
        
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response data:', error.response.data);
        }
        
        console.log('\n🔧 Troubleshooting tips:');
        console.log('1. Check your MOMO_SUBSCRIPTION_KEY is correct');
        console.log('2. Ensure your CALLBACK_HOST is accessible');
        console.log('3. Verify you have proper network connectivity');
        console.log('4. Check if the MoMo sandbox is available');
        
        process.exit(1);
    }
}

async function testCredentials(apiUserId, apiKey) {
    try {
        const endpoint = `${config.momo.baseUrl}/collection/token/`;
        const auth = Buffer.from(`${apiUserId}:${apiKey}`).toString('base64');
        
        const response = await axios.post(endpoint, null, {
            headers: {
                'Authorization': `Basic ${auth}`,
                'Ocp-Apim-Subscription-Key': config.momo.subscriptionKey,
                'Content-Type': 'application/json'
            },
            timeout: 10000
        });
        
        if (response.status === 200 && response.data.access_token) {
            console.log('✅ Credentials test PASSED - Access token obtained');
            console.log(`⏰ Token expires in: ${response.data.expires_in} seconds`);
            return { success: true };
        } else {
            console.log('❌ Credentials test FAILED - No access token');
            return { success: false, error: 'No access token received' };
        }
        
    } catch (error) {
        console.error('❌ Credentials test FAILED:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Response:', error.response.data);
        }
        return { success: false, error: error.message };
    }
}

// Run the script
if (require.main === module) {
    setupMomoApiUser();
}

module.exports = { setupMomoApiUser, testCredentials }; 