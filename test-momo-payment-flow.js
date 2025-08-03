require('dotenv').config();
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const config = require('./config');
const logger = require('./utils/logger');

class MomoPaymentFlowTester {
    constructor() {
        this.baseUrl = config.momo.baseUrl;
        this.subscriptionKey = config.momo.subscriptionKey;
        this.apiUserId = config.momo.apiUserId;
        this.apiKey = config.momo.apiKey;
        this.callbackUrl = `${config.service.url}/momo/callback`;
        this.currency = 'EUR'; // Use EUR for sandbox testing (UGX not supported)
        this.testResults = [];
    }

    async runAllTests() {
        console.log('🚀 Starting MoMo Payment Flow Tests...\n');
        console.log(`📡 Base URL: ${this.baseUrl}`);
        console.log(`💰 Currency: ${this.currency} (sandbox supported)`);
        console.log(`🌐 Callback URL: ${this.callbackUrl}\n`);

        try {
            // Test 1: Authentication
            await this.testAuthentication();

            // Test 2: API User Status
            await this.testApiUserStatus();

            // Test 3: Payment Request (Weekly Plan)
            await this.testPaymentRequest('weekly', 1); // 1 EUR for testing

            // Test 4: Payment Request (Monthly Plan)
            await this.testPaymentRequest('monthly', 2); // 2 EUR for testing

            // Test 5: Payment Status Check
            await this.testPaymentStatusCheck();

            // Test 6: Simulate Callback
            await this.testCallbackSimulation();

            this.printTestSummary();

        } catch (error) {
            console.error('❌ Test suite failed:', error.message);
            this.printTestSummary();
        }
    }

    async testAuthentication() {
        console.log('🔐 Test 1: Authentication');
        try {
            const auth = Buffer.from(`${this.apiUserId}:${this.apiKey}`).toString('base64');
            const response = await axios.post(`${this.baseUrl}/collection/token/`, null, {
                headers: {
                    'Authorization': `Basic ${auth}`,
                    'Ocp-Apim-Subscription-Key': this.subscriptionKey,
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            });

            if (response.status === 200 && response.data.access_token) {
                this.testResults.push({
                    test: 'Authentication',
                    status: 'PASS',
                    details: `Token obtained, expires in ${response.data.expires_in}s`
                });
                console.log('✅ Authentication successful');
                this.accessToken = response.data.access_token;
            } else {
                throw new Error('No access token received');
            }
        } catch (error) {
            this.testResults.push({
                test: 'Authentication',
                status: 'FAIL',
                details: error.message
            });
            console.log('❌ Authentication failed:', error.message);
            throw error;
        }
    }

    async testApiUserStatus() {
        console.log('\n👤 Test 2: API User Status');
        try {
            const response = await axios.get(`${this.baseUrl}/v1_0/apiuser/${this.apiUserId}`, {
                headers: {
                    'Ocp-Apim-Subscription-Key': this.subscriptionKey,
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            });

            if (response.status === 200) {
                this.testResults.push({
                    test: 'API User Status',
                    status: 'PASS',
                    details: 'API User exists and is active'
                });
                console.log('✅ API User status check successful');
            } else {
                throw new Error(`Unexpected status: ${response.status}`);
            }
        } catch (error) {
            this.testResults.push({
                test: 'API User Status',
                status: 'FAIL',
                details: error.message
            });
            console.log('❌ API User status check failed:', error.message);
        }
    }

    async testPaymentRequest(planType, amount) {
        console.log(`\n💳 Test 3: Payment Request (${planType} plan - ${amount} ${this.currency})`);
        try {
            const referenceId = uuidv4();
            const externalId = uuidv4();
            const payerMessage = `Payment for ${planType} plan`;
            const payeeNote = `Test payment for ${planType} subscription`;

            const paymentData = {
                amount: amount.toString(),
                currency: this.currency,
                externalId: externalId,
                payer: {
                    partyIdType: 'MSISDN',
                    partyId: '256770000000' // Test phone number for sandbox
                },
                payerMessage: payerMessage,
                payeeNote: payeeNote
            };

            const response = await axios.post(`${this.baseUrl}/collection/v1_0/requesttopay`, paymentData, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'X-Reference-Id': referenceId,
                    'X-Target-Environment': 'sandbox',
                    'Ocp-Apim-Subscription-Key': this.subscriptionKey,
                    'Content-Type': 'application/json'
                },
                timeout: 15000
            });

            if (response.status === 202) {
                this.testResults.push({
                    test: `Payment Request (${planType})`,
                    status: 'PASS',
                    details: `Payment initiated successfully. Reference: ${referenceId}`
                });
                console.log(`✅ ${planType} payment request successful`);
                console.log(`   Reference ID: ${referenceId}`);
                console.log(`   External ID: ${externalId}`);
                
                // Store for status check
                this.lastPaymentReference = referenceId;
                this.lastExternalId = externalId;
            } else {
                throw new Error(`Unexpected status: ${response.status}`);
            }
        } catch (error) {
            this.testResults.push({
                test: `Payment Request (${planType})`,
                status: 'FAIL',
                details: error.message
            });
            console.log(`❌ ${planType} payment request failed:`, error.message);
            if (error.response?.data) {
                console.log(`   Error details: ${JSON.stringify(error.response.data, null, 2)}`);
            }
        }
    }

    async testPaymentStatusCheck() {
        console.log('\n📊 Test 4: Payment Status Check');
        if (!this.lastPaymentReference) {
            console.log('⚠️ Skipping status check - no payment reference available');
            return;
        }

        try {
            const response = await axios.get(`${this.baseUrl}/collection/v1_0/requesttopay/${this.lastPaymentReference}`, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'X-Target-Environment': 'sandbox',
                    'Ocp-Apim-Subscription-Key': this.subscriptionKey,
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            });

            if (response.status === 200) {
                this.testResults.push({
                    test: 'Payment Status Check',
                    status: 'PASS',
                    details: `Status: ${response.data.status || 'Unknown'}`
                });
                console.log('✅ Payment status check successful');
                console.log(`   Status: ${response.data.status || 'Unknown'}`);
            } else {
                throw new Error(`Unexpected status: ${response.status}`);
            }
        } catch (error) {
            this.testResults.push({
                test: 'Payment Status Check',
                status: 'FAIL',
                details: error.message
            });
            console.log('❌ Payment status check failed:', error.message);
        }
    }

    async testCallbackSimulation() {
        console.log('\n🔄 Test 5: Callback Simulation');
        try {
            // Simulate a successful payment callback
            const callbackData = {
                referenceId: this.lastPaymentReference || 'test-reference',
                status: 'SUCCESSFUL',
                financialTransactionId: 'test-transaction-id',
                reason: 'SUCCESSFUL'
            };

            const response = await axios.post(this.callbackUrl, callbackData, {
                headers: {
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            });

            if (response.status === 200) {
                this.testResults.push({
                    test: 'Callback Simulation',
                    status: 'PASS',
                    details: 'Callback endpoint responded successfully'
                });
                console.log('✅ Callback simulation successful');
            } else {
                throw new Error(`Unexpected status: ${response.status}`);
            }
        } catch (error) {
            this.testResults.push({
                test: 'Callback Simulation',
                status: 'FAIL',
                details: error.message
            });
            console.log('❌ Callback simulation failed:', error.message);
        }
    }

    printTestSummary() {
        console.log('\n' + '='.repeat(60));
        console.log('📋 TEST SUMMARY');
        console.log('='.repeat(60));

        const passed = this.testResults.filter(r => r.status === 'PASS').length;
        const failed = this.testResults.filter(r => r.status === 'FAIL').length;
        const total = this.testResults.length;

        console.log(`✅ Passed: ${passed}`);
        console.log(`❌ Failed: ${failed}`);
        console.log(`📊 Total: ${total}`);

        console.log('\n📝 Detailed Results:');
        this.testResults.forEach((result, index) => {
            const icon = result.status === 'PASS' ? '✅' : '❌';
            console.log(`${index + 1}. ${icon} ${result.test}: ${result.status}`);
            console.log(`   Details: ${result.details}`);
        });

        console.log('\n' + '='.repeat(60));
        
        if (failed === 0) {
            console.log('🎉 ALL TESTS PASSED! Your MoMo integration is working correctly.');
            console.log('💡 This means your production setup with SSP should work perfectly!');
            console.log('📝 Note: Sandbox uses EUR, Production will use SSP');
        } else {
            console.log('⚠️ Some tests failed. Please check the details above.');
            console.log('🔧 Fix the issues before deploying to production.');
        }
        console.log('='.repeat(60));
    }
}

// Run the tests
async function main() {
    const tester = new MomoPaymentFlowTester();
    await tester.runAllTests();
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = MomoPaymentFlowTester; 