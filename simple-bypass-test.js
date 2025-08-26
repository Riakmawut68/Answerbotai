/**
 * Simple Bypass Logic Test
 * Tests just the bypass detection logic with comprehensive logging
 */

require('dotenv').config();
const SandboxBypassService = require('./services/sandboxBypassService');
const config = require('./config');
const logger = require('./utils/logger');

async function testBypassLogic() {
    logger.info('🧪 [BYPASS LOGIC TEST - COMPREHENSIVE LOGGING]');
    logger.info('===============================================');
    
    // Show environment configuration
    logger.info('📋 [ENVIRONMENT CONFIGURATION]');
    logger.info(`  ├── NODE_ENV: ${process.env.NODE_ENV || 'undefined'}`);
    logger.info(`  ├── Environment: ${config.app.environment}`);
    logger.info(`  ├── Sandbox enabled: ${config.sandbox?.enableBypass || false}`);
    logger.info(`  ├── Test phone numbers: ${JSON.stringify(config.sandbox?.testPhoneNumbers || [])}`);
    logger.info(`  └── Hardcoded test number: ${config.momo?.getTestPhoneNumber?.() || 'N/A'}`);
    
    // Initialize bypass service
    const sandboxBypass = new SandboxBypassService();
    
    // Test cases
    const testCases = [
        { phone: '0921234567', description: 'Primary test number (from logs)' },
        { phone: '0927654321', description: 'Secondary test number (from config)' }, 
        { phone: '0923456789', description: 'Regular MTN number' },
        { phone: '0928888888', description: 'Another regular MTN number' }
    ];
    
    logger.info('\n🔍 [TESTING BYPASS DETECTION]');
    logger.info('==============================');
    
    for (const testCase of testCases) {
        logger.info(`\n📞 Testing: ${testCase.phone} (${testCase.description})`);
        logger.info('─'.repeat(50));
        
        // This will trigger the comprehensive logging we added
        const shouldBypass = sandboxBypass.shouldBypassPayment(testCase.phone);
        
        logger.info(`📊 Result: ${shouldBypass ? '🔓 BYPASS TRIGGERED' : '✅ NORMAL PAYMENT'}`);
    }
    
    logger.info('\n📈 [SUMMARY]');
    logger.info('=============');
    logger.info('Check the detailed logs above to verify:');
    logger.info('1. Environment settings are correct');
    logger.info('2. Test phone numbers are properly configured');
    logger.info('3. Bypass detection logic works as expected');
    logger.info('4. Both test numbers (0921234567, 0927654321) trigger bypass');
    logger.info('5. Regular numbers (0923456789, 0928888888) do NOT trigger bypass');
}

// Run the test
testBypassLogic().catch(console.error);
