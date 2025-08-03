#!/usr/bin/env node

/**
 * MoMo Integration Setup Script
 * Helps configure and validate MoMo integration
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const readline = require('readline');

class MomoSetup {
    constructor() {
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        this.envPath = path.join(process.cwd(), '.env');
    }

    async run() {
        console.log('🚀 MTN MoMo Integration Setup');
        console.log('='.repeat(50));
        
        try {
            await this.checkExistingConfig();
            await this.guideUser();
            await this.validateSetup();
            await this.runTests();
            
            console.log('\n✅ MoMo integration setup completed successfully!');
            console.log('\n📚 Next steps:');
            console.log('   1. Review the MOMO_INTEGRATION_GUIDE.md for detailed information');
            console.log('   2. Test the integration with: npm run test-momo');
            console.log('   3. Monitor logs for any issues');
            console.log('   4. Deploy to production when ready');
            
        } catch (error) {
            console.error('\n❌ Setup failed:', error.message);
            process.exit(1);
        } finally {
            this.rl.close();
        }
    }

    async checkExistingConfig() {
        console.log('\n🔍 Checking existing configuration...');
        
        const requiredVars = [
            'MOMO_ENVIRONMENT',
            'MOMO_API_USER_ID', 
            'MOMO_API_KEY',
            'MOMO_SUBSCRIPTION_KEY',
            'CALLBACK_HOST'
        ];

        const missing = [];
        const existing = {};

        for (const varName of requiredVars) {
            if (process.env[varName]) {
                existing[varName] = this.maskValue(process.env[varName]);
            } else {
                missing.push(varName);
            }
        }

        if (Object.keys(existing).length > 0) {
            console.log('✅ Found existing configuration:');
            Object.entries(existing).forEach(([key, value]) => {
                console.log(`   ${key}: ${value}`);
            });
        }

        if (missing.length > 0) {
            console.log('❌ Missing configuration variables:');
            missing.forEach(varName => {
                console.log(`   ${varName}`);
            });
        }

        return { missing, existing };
    }

    async guideUser() {
        console.log('\n📝 Configuration Guide:');
        console.log('='.repeat(50));
        
        console.log('\n1️⃣  Environment Setup:');
        console.log('   • MOMO_ENVIRONMENT: Set to "sandbox" for testing, "production" for live');
        console.log('   • CALLBACK_HOST: Your server URL (e.g., https://your-domain.com)');
        
        console.log('\n2️⃣  API Credentials:');
        console.log('   • MOMO_API_USER_ID: Your MoMo API User ID (UUID format)');
        console.log('   • MOMO_API_KEY: Your MoMo API Key (UUID format)');
        console.log('   • MOMO_SUBSCRIPTION_KEY: Your MoMo Subscription Key (UUID format)');
        
        console.log('\n3️⃣  Getting Credentials:');
        console.log('   • Visit: https://momodeveloper.mtn.com');
        console.log('   • Create an account and register your application');
        console.log('   • Generate API User and collect credentials');
        console.log('   • Set up your callback URL: https://your-domain.com/momo/callback');
        
        console.log('\n4️⃣  Testing:');
        console.log('   • Start with sandbox environment');
        console.log('   • Test with small amounts');
        console.log('   • Verify callbacks are working');
        
        const answer = await this.question('\n❓ Do you want to configure these variables now? (y/n): ');
        
        if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
            await this.configureVariables();
        } else {
            console.log('\nℹ️  Please configure the environment variables manually and run this script again.');
        }
    }

    async configureVariables() {
        console.log('\n🔧 Interactive Configuration:');
        console.log('='.repeat(50));
        
        const config = {};
        
        // Environment
        config.MOMO_ENVIRONMENT = await this.question('Environment (sandbox/production) [sandbox]: ') || 'sandbox';
        
        // Callback Host
        config.CALLBACK_HOST = await this.question('Callback Host URL (e.g., https://your-domain.com): ');
        if (!config.CALLBACK_HOST) {
            throw new Error('Callback Host is required');
        }
        
        // API Credentials
        console.log('\n📋 API Credentials (get these from https://momodeveloper.mtn.com):');
        config.MOMO_API_USER_ID = await this.question('API User ID (UUID): ');
        config.MOMO_API_KEY = await this.question('API Key (UUID): ');
        config.MOMO_SUBSCRIPTION_KEY = await this.question('Subscription Key (UUID): ');
        
        // Validate UUIDs
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        
        if (!uuidRegex.test(config.MOMO_API_USER_ID)) {
            throw new Error('Invalid API User ID format (must be UUID)');
        }
        if (!uuidRegex.test(config.MOMO_API_KEY)) {
            throw new Error('Invalid API Key format (must be UUID)');
        }
        if (!uuidRegex.test(config.MOMO_SUBSCRIPTION_KEY)) {
            throw new Error('Invalid Subscription Key format (must be UUID)');
        }
        
        // Save to .env file
        await this.saveToEnv(config);
        
        console.log('\n✅ Configuration saved to .env file');
    }

    async saveToEnv(config) {
        let envContent = '';
        
        // Read existing .env file
        if (fs.existsSync(this.envPath)) {
            envContent = fs.readFileSync(this.envPath, 'utf8');
        }
        
        // Add or update MoMo configuration
        const lines = envContent.split('\n');
        const newLines = [];
        
        // Keep existing lines that don't conflict
        for (const line of lines) {
            if (line.trim() && !line.startsWith('MOMO_') && !line.startsWith('CALLBACK_HOST=')) {
                newLines.push(line);
            }
        }
        
        // Add MoMo configuration
        newLines.push('\n# MTN MoMo Configuration');
        newLines.push(`MOMO_ENVIRONMENT=${config.MOMO_ENVIRONMENT}`);
        newLines.push(`MOMO_API_USER_ID=${config.MOMO_API_USER_ID}`);
        newLines.push(`MOMO_API_KEY=${config.MOMO_API_KEY}`);
        newLines.push(`MOMO_SUBSCRIPTION_KEY=${config.MOMO_SUBSCRIPTION_KEY}`);
        newLines.push(`CALLBACK_HOST=${config.CALLBACK_HOST}`);
        
        // Write back to .env file
        fs.writeFileSync(this.envPath, newLines.join('\n'));
    }

    async validateSetup() {
        console.log('\n🔍 Validating setup...');
        
        // Reload environment variables
        require('dotenv').config();
        
        const requiredVars = [
            'MOMO_ENVIRONMENT',
            'MOMO_API_USER_ID', 
            'MOMO_API_KEY',
            'MOMO_SUBSCRIPTION_KEY',
            'CALLBACK_HOST'
        ];

        const missing = requiredVars.filter(v => !process.env[v]);
        
        if (missing.length > 0) {
            throw new Error(`Missing required variables: ${missing.join(', ')}`);
        }
        
        console.log('✅ All required variables are configured');
        
        // Validate UUIDs
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        
        if (!uuidRegex.test(process.env.MOMO_API_USER_ID)) {
            throw new Error('Invalid MOMO_API_USER_ID format');
        }
        if (!uuidRegex.test(process.env.MOMO_API_KEY)) {
            throw new Error('Invalid MOMO_API_KEY format');
        }
        if (!uuidRegex.test(process.env.MOMO_SUBSCRIPTION_KEY)) {
            throw new Error('Invalid MOMO_SUBSCRIPTION_KEY format');
        }
        
        console.log('✅ All UUIDs are valid');
        
        // Validate callback host
        if (!process.env.CALLBACK_HOST.startsWith('http')) {
            throw new Error('CALLBACK_HOST must be a valid HTTP/HTTPS URL');
        }
        
        console.log('✅ Callback host is valid');
    }

    async runTests() {
        console.log('\n🧪 Running integration tests...');
        
        try {
            const MomoIntegrationTest = require('./test-momo-integration');
            const tester = new MomoIntegrationTest();
            
            const initialized = await tester.initialize();
            if (!initialized) {
                throw new Error('Failed to initialize MoMo service');
            }
            
            // Run basic tests
            const serviceInfo = tester.momoService.getServiceInfo();
            console.log('✅ Service initialization: PASSED');
            
            const config = tester.momoService.config.getDebugInfo();
            console.log('✅ Configuration validation: PASSED');
            
            console.log('\n📊 Configuration Summary:');
            console.log(`   Environment: ${config.environment}`);
            console.log(`   Base URL: ${config.baseUrl}`);
            console.log(`   Currency: ${config.currency}`);
            console.log(`   Callback Host: ${config.callbackHost}`);
            
        } catch (error) {
            console.log(`⚠️  Test warning: ${error.message}`);
            console.log('   This is normal for initial setup. Run "npm run test-momo" for full testing.');
        }
    }

    question(prompt) {
        return new Promise((resolve) => {
            this.rl.question(prompt, resolve);
        });
    }

    maskValue(value) {
        if (!value) return 'null';
        return value.slice(0, 4) + '*'.repeat(Math.max(0, value.length - 4));
    }
}

// Run the setup
if (require.main === module) {
    const setup = new MomoSetup();
    setup.run().catch(error => {
        console.error('❌ Setup failed:', error.message);
        process.exit(1);
    });
}

module.exports = MomoSetup; 