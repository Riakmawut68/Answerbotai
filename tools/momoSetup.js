// MTN MoMo Setup and Testing Tool
require('dotenv').config();
const MomoService = require('../services/momo');

class MomoSetupTool {
    constructor() {
        this.momoService = null;
    }

    async initialize() {
        try {
            this.momoService = new MomoService();
            console.log('✅ MomoService initialized successfully');
            return true;
        } catch (error) {
            console.log('❌ MomoService initialization failed:', error.message);
            return false;
        }
    }

    async runDiagnostics() {
        console.log('\n=== MTN MoMo Service Diagnostics ===\n');
        
        if (!this.momoService) {
            const initialized = await this.initialize();
            if (!initialized) {
                console.log('Cannot run diagnostics - service initialization failed');
                return;
            }
        }

        const results = await this.momoService.diagnose();
        
        console.log('Configuration:');
        console.log(`  Environment: ${results.config.environment}`);
        console.log(`  Base URL: ${results.config.baseUrl}`);
        console.log(`  Currency: ${results.config.currency}`);
        console.log(`  API User ID: ${results.config.apiUserId}`);
        console.log(`  API Key: ${results.config.apiKey}`);
        console.log(`  Subscription Key: ${results.config.subscriptionKey}`);
        console.log(`  Callback Host: ${results.config.callbackHost}`);
        
        console.log('\nStatus Checks:');
        console.log(`  API User Exists: ${results.apiUserExists ? '✅' : '❌'}`);
        console.log(`  Authentication Works: ${results.authenticationWorks ? '✅' : '❌'}`);
        console.log(`  Overall Status: ${results.overallStatus}`);
        
        if (results.errors && results.errors.length > 0) {
            console.log('\nErrors Found:');
            results.errors.forEach((error, index) => {
                console.log(`  ${index + 1}. ${error}`);
            });
        }

        console.log('\n=== Diagnostics Complete ===\n');
        
        return results;
    }

    async setupNewCredentials() {
        console.log('\n=== Setting Up New MoMo Credentials ===\n');
        
        if (!this.momoService) {
            const initialized = await this.initialize();
            if (!initialized) {
                console.log('Cannot setup credentials - service initialization failed');
                return;
            }
        }

        try {
            const result = await this.momoService.setupNewCredentials();
            
            if (result.success) {
                console.log('✅ New credentials created successfully!');
                console.log('\n=== UPDATE YOUR .ENV FILE ===');
                console.log(`MOMO_API_USER_ID=${result.apiUserId}`);
                console.log(`MOMO_API_KEY=${result.apiKey}`);
                console.log('===============================\n');
                
                return result;
            } else {
                console.log('❌ Failed to create new credentials');
                return null;
            }
            
        } catch (error) {
            console.log('❌ Credential setup failed:', error.message);
            return null;
        }
    }

    async testPayment() {
        console.log('\n=== Testing Payment Flow ===\n');
        
        if (!this.momoService) {
            const initialized = await this.initialize();
            if (!initialized) {
                console.log('Cannot test payment - service initialization failed');
                return;
            }
        }

        // Create a test user object
        const testUser = {
            messengerId: 'test-user-123',
            mobileNumber: '256782181481', // MTN sandbox test number
            paymentMobileNumber: '256782181481',
            stage: 'awaiting_payment',
            subscription: { status: 'none' },
            paymentSession: null,
            save: async function() {
                console.log('  📝 User data saved (mock)');
            }
        };

        try {
            console.log('Initiating test payment...');
            const result = await this.momoService.initiatePayment(testUser, 'weekly');
            
            if (result.success) {
                console.log('✅ Payment initiated successfully!');
                console.log(`  Reference: ${result.reference}`);
                console.log(`  Amount: ${result.amount} SSP`);
                console.log(`  Plan: ${result.planType}`);
                
                // Wait a moment then check status
                console.log('\nWaiting 3 seconds before checking status...');
                await this.delay(3000);
                
                console.log('Checking payment status...');
                const statusResult = await this.momoService.checkPaymentStatus(result.reference);
                
                console.log(`  Status: ${statusResult.status}`);
                console.log(`  Successful: ${statusResult.successful ? '✅' : '❌'}`);
                
                return result;
            } else {
                console.log('❌ Payment initiation failed');
                return null;
            }
            
        } catch (error) {
            console.log('❌ Payment test failed:', error.message);
            return null;
        }
    }

    async testConnection() {
        console.log('\n=== Testing MoMo Connection ===\n');
        
        if (!this.momoService) {
            const initialized = await this.initialize();
            if (!initialized) {
                console.log('Cannot test connection - service initialization failed');
                return;
            }
        }

        const result = await this.momoService.testConnection();
        
        if (result.success) {
            console.log('✅ Connection test passed!');
            console.log('  Service is ready for payments');
        } else {
            console.log('❌ Connection test failed:', result.error);
        }
        
        return result;
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async runFullSetup() {
        console.log('🚀 Starting Full MoMo Setup Process\n');
        
        // Step 1: Run diagnostics
        const diagnostics = await this.runDiagnostics();
        
        if (diagnostics.overallStatus === 'healthy') {
            console.log('✅ Service is already healthy! Testing connection...');
            await this.testConnection();
            return;
        }
        
        // Step 2: Setup new credentials if needed
        if (!diagnostics.apiUserExists || !diagnostics.authenticationWorks) {
            console.log('🔧 Setting up new credentials...');
            const setupResult = await this.setupNewCredentials();
            
            if (setupResult) {
                console.log('✅ New credentials setup complete');
                console.log('⚠️  Please update your .env file with the new credentials above');
                console.log('⚠️  Then restart your application and run this tool again');
            }
        }
        
        console.log('\n🎉 Setup process complete!');
    }
}

// CLI Interface
async function main() {
    const setupTool = new MomoSetupTool();
    const command = process.argv[2];
    
    switch (command) {
        case 'diagnose':
            await setupTool.runDiagnostics();
            break;
        case 'setup':
            await setupTool.setupNewCredentials();
            break;
        case 'test':
            await setupTool.testConnection();
            break;
        case 'payment':
            await setupTool.testPayment();
            break;
        case 'full':
        default:
            await setupTool.runFullSetup();
            break;
    }
}

// Run if called directly
if (require.main === module) {
    main().catch(console.error);
}

module.exports = MomoSetupTool;
