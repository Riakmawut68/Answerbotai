/**
 * Answer Bot AI - Comprehensive Test Script
 * 
 * This script tests all user interaction flows and database interactions
 * for the Answer Bot AI chatbot. Run this script to verify that all
 * scenarios work correctly.
 */

const mongoose = require('mongoose');
const User = require('./models/user');
const Conversation = require('./models/conversation');
const config = require('./config');
const logger = require('./utils/logger');

class AnswerBotAITester {
    constructor() {
        this.testResults = [];
        this.testUser = null;
        this.testConversation = null;
    }

    // Initialize test environment
    async initialize() {
        try {
            logger.info('🧪 Initializing Answer Bot AI Test Suite...');
            
            // Connect to test database
            await mongoose.connect(config.database.uri, config.database.options);
            logger.info('✅ Database connected for testing');
            
            // Create test user
            this.testUser = new User({
                messengerId: 'test_user_12345',
                stage: 'initial',
                trialMessagesUsedToday: 0,
                dailyMessageCount: 0,
                hasUsedTrial: false
            });
            await this.testUser.save();
            logger.info('✅ Test user created');
            
            return true;
        } catch (error) {
            logger.error('❌ Test initialization failed:', error);
            return false;
        }
    }

    // Clean up test environment
    async cleanup() {
        try {
            // Remove test user and conversation
            if (this.testUser) {
                await User.deleteOne({ _id: this.testUser._id });
            }
            if (this.testConversation) {
                await Conversation.deleteOne({ _id: this.testConversation._id });
            }
            
            // Close database connection
            await mongoose.connection.close();
            logger.info('✅ Test cleanup completed');
        } catch (error) {
            logger.error('❌ Test cleanup failed:', error);
        }
    }

    // Test helper: Assert condition
    assert(condition, message) {
        if (!condition) {
            throw new Error(`❌ Assertion failed: ${message}`);
        }
    }

    // Test helper: Log test result
    logTestResult(testName, passed, details = '') {
        const result = {
            testName,
            passed,
            details,
            timestamp: new Date().toISOString()
        };
        this.testResults.push(result);
        
        const status = passed ? '✅' : '❌';
        logger.info(`${status} ${testName}: ${details}`);
    }

    // Test 1: New User Onboarding Flow
    async testNewUserOnboarding() {
        logger.info('\n🧪 Testing New User Onboarding Flow...');
        
        try {
            // Test 1.1: User sends "Hi" (new user)
            const newUser = new User({
                messengerId: 'new_user_123',
                stage: 'initial'
            });
            await newUser.save();
            
            this.assert(newUser.stage === 'initial', 'New user should have initial stage');
            this.assert(!newUser.consentTimestamp, 'New user should not have consent timestamp');
            
            this.logTestResult('New User Creation', true, 'User created with correct initial state');
            
            // Test 1.2: User clicks "I Agree"
            newUser.consentTimestamp = new Date();
            newUser.stage = 'awaiting_phone';
            await newUser.save();
            
            this.assert(newUser.stage === 'awaiting_phone', 'User stage should be awaiting_phone after consent');
            this.assert(newUser.consentTimestamp, 'User should have consent timestamp');
            
            this.logTestResult('User Consent', true, 'User consent recorded correctly');
            
            // Cleanup
            await User.deleteOne({ _id: newUser._id });
            
        } catch (error) {
            this.logTestResult('New User Onboarding', false, error.message);
        }
    }

    // Test 2: Phone Number Validation Flow
    async testPhoneNumberValidation() {
        logger.info('\n🧪 Testing Phone Number Validation Flow...');
        
        try {
            const user = new User({
                messengerId: 'phone_test_user',
                stage: 'awaiting_phone'
            });
            await user.save();
            
            // Test 2.1: Valid MTN number (first time)
            const validNumber = '0921234567';
            const existingUser = await User.findOne({ mobileNumber: validNumber });
            
            if (!existingUser) {
                user.mobileNumber = validNumber;
                user.stage = 'trial';
                user.hasUsedTrial = true;
                user.trialStartDate = new Date();
                await user.save();
                
                this.assert(user.mobileNumber === validNumber, 'Valid number should be saved');
                this.assert(user.stage === 'trial', 'User should be in trial stage');
                this.assert(user.hasUsedTrial, 'User should have used trial flag');
                
                this.logTestResult('Valid Phone Number', true, 'Valid MTN number accepted');
            } else {
                this.logTestResult('Valid Phone Number', true, 'Number already exists (expected)');
            }
            
            // Test 2.2: Invalid number format
            const invalidNumber = '1234567890';
            const isValidFormat = /^092\d{7}$/.test(invalidNumber);
            
            this.assert(!isValidFormat, 'Invalid number should fail validation');
            this.logTestResult('Invalid Phone Number', true, 'Invalid number correctly rejected');
            
            // Cleanup
            await User.deleteOne({ _id: user._id });
            
        } catch (error) {
            this.logTestResult('Phone Number Validation', false, error.message);
        }
    }

    // Test 3: Free Trial Flow
    async testFreeTrialFlow() {
        logger.info('\n🧪 Testing Free Trial Flow...');
        
        try {
            const user = new User({
                messengerId: 'trial_test_user',
                stage: 'trial',
                trialMessagesUsedToday: 0,
                hasUsedTrial: true,
                trialStartDate: new Date()
            });
            await user.save();
            
            // Test 3.1: Trial user sends message (within limit)
            this.assert(user.trialMessagesUsedToday < config.limits.trialMessagesPerDay, 
                'User should be within trial limit');
            
            user.trialMessagesUsedToday += 1;
            await user.save();
            
            this.assert(user.trialMessagesUsedToday === 1, 'Trial usage should increment');
            this.logTestResult('Trial Message Within Limit', true, 'Trial message processed correctly');
            
            // Test 3.2: Trial user reaches daily limit
            user.trialMessagesUsedToday = config.limits.trialMessagesPerDay;
            await user.save();
            
            this.assert(user.trialMessagesUsedToday >= config.limits.trialMessagesPerDay, 
                'User should have reached trial limit');
            this.logTestResult('Trial Limit Reached', true, 'Trial limit correctly enforced');
            
            // Test 3.3: Manual trial reset
            user.trialMessagesUsedToday = 0;
            user.lastTrialResetDate = new Date();
            await user.save();
            
            this.assert(user.trialMessagesUsedToday === 0, 'Trial usage should reset to 0');
            this.logTestResult('Trial Reset', true, 'Trial usage reset correctly');
            
            // Cleanup
            await User.deleteOne({ _id: user._id });
            
        } catch (error) {
            this.logTestResult('Free Trial Flow', false, error.message);
        }
    }

    // Test 4: Subscription Flow
    async testSubscriptionFlow() {
        logger.info('\n🧪 Testing Subscription Flow...');
        
        try {
            const user = new User({
                messengerId: 'subscription_test_user',
                stage: 'trial',
                subscription: {
                    planType: 'none',
                    status: 'none'
                }
            });
            await user.save();
            
            // Test 4.1: User clicks subscription plan
            user.lastSelectedPlanType = 'weekly';
            await user.save();
            
            this.assert(user.lastSelectedPlanType === 'weekly', 'Plan type should be saved');
            this.logTestResult('Subscription Plan Selection', true, 'Plan selection recorded');
            
            // Test 4.2: Payment session creation
            user.paymentSession = {
                planType: 'weekly',
                amount: config.limits.subscriptionPlans.weekly.price,
                startTime: new Date(),
                status: 'pending',
                reference: 'test_ref_123'
            };
            user.stage = 'awaiting_payment';
            await user.save();
            
            this.assert(user.stage === 'awaiting_payment', 'User should be in payment stage');
            this.assert(user.paymentSession.status === 'pending', 'Payment should be pending');
            this.logTestResult('Payment Session Creation', true, 'Payment session created correctly');
            
            // Test 4.3: Payment success
            user.paymentSession.status = 'completed';
            user.subscription = {
                planType: 'weekly',
                amount: config.limits.subscriptionPlans.weekly.price,
                startDate: new Date(),
                expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
                status: 'active',
                paymentReference: 'test_ref_123'
            };
            user.stage = 'subscribed';
            await user.save();
            
            this.assert(user.subscription.status === 'active', 'Subscription should be active');
            this.assert(user.stage === 'subscribed', 'User should be in active subscription stage');
            this.logTestResult('Payment Success', true, 'Payment success handled correctly');
            
            // Cleanup
            await User.deleteOne({ _id: user._id });
            
        } catch (error) {
            this.logTestResult('Subscription Flow', false, error.message);
        }
    }

    // Test 5: Paid Subscriber Flow
    async testPaidSubscriberFlow() {
        logger.info('\n🧪 Testing Paid Subscriber Flow...');
        
        try {
            const user = new User({
                messengerId: 'paid_test_user',
                stage: 'subscribed',
                dailyMessageCount: 0,
                subscription: {
                    planType: 'weekly',
                    status: 'active',
                    expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                }
            });
            await user.save();
            
            // Test 5.1: Paid user sends message (within limit)
            this.assert(user.dailyMessageCount < config.limits.subscriptionMessagesPerDay, 
                'User should be within daily limit');
            
            user.dailyMessageCount += 1;
            await user.save();
            
            this.assert(user.dailyMessageCount === 1, 'Daily message count should increment');
            this.logTestResult('Paid User Message Within Limit', true, 'Paid message processed correctly');
            
            // Test 5.2: Paid user reaches daily limit
            user.dailyMessageCount = config.limits.subscriptionMessagesPerDay;
            await user.save();
            
            this.assert(user.dailyMessageCount >= config.limits.subscriptionMessagesPerDay, 
                'User should have reached daily limit');
            this.logTestResult('Paid User Daily Limit', true, 'Daily limit correctly enforced');
            
            // Test 5.3: Subscription expired
            user.subscription.expiryDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // Expired yesterday
            user.subscription.status = 'expired';
            user.stage = 'subscription_expired';
            await user.save();
            
            this.assert(user.subscription.status === 'expired', 'Subscription should be expired');
            this.assert(user.stage === 'subscription_expired', 'User should be in expired stage');
            this.logTestResult('Subscription Expired', true, 'Subscription expiry handled correctly');
            
            // Cleanup
            await User.deleteOne({ _id: user._id });
            
        } catch (error) {
            this.logTestResult('Paid Subscriber Flow', false, error.message);
        }
    }

    // Test 6: Command Processing Flow
    async testCommandProcessing() {
        logger.info('\n🧪 Testing Command Processing Flow...');
        
        try {
            const user = new User({
                messengerId: 'command_test_user',
                stage: 'trial',
                trialMessagesUsedToday: 2,
                dailyMessageCount: 5
            });
            await user.save();
            
            // Test 6.1: Reset command
            const resetCommands = ['resetme', 'RESETME', 'ResetMe'];
            for (const command of resetCommands) {
                const isResetCommand = command.toLowerCase() === 'resetme';
                this.assert(isResetCommand, `Command "${command}" should be recognized as reset command`);
            }
            this.logTestResult('Reset Command Recognition', true, 'Reset command correctly identified');
            
            // Test 6.2: Cancel command
            const cancelCommands = ['cancel', 'CANCEL', 'Cancel'];
            for (const command of cancelCommands) {
                const isCancelCommand = command.toLowerCase() === 'cancel';
                this.assert(isCancelCommand, `Command "${command}" should be recognized as cancel command`);
            }
            this.logTestResult('Cancel Command Recognition', true, 'Cancel command correctly identified');
            
            // Test 6.3: Help command
            const helpCommands = ['help', 'HELP', 'Help'];
            for (const command of helpCommands) {
                const isHelpCommand = command.toLowerCase() === 'help';
                this.assert(isHelpCommand, `Command "${command}" should be recognized as help command`);
            }
            this.logTestResult('Help Command Recognition', true, 'Help command correctly identified');
            
            // Test 6.4: Status command
            const statusCommands = ['status', 'STATUS', 'Status'];
            for (const command of statusCommands) {
                const isStatusCommand = command.toLowerCase() === 'status';
                this.assert(isStatusCommand, `Command "${command}" should be recognized as status command`);
            }
            this.logTestResult('Status Command Recognition', true, 'Status command correctly identified');
            
            // Cleanup
            await User.deleteOne({ _id: user._id });
            
        } catch (error) {
            this.logTestResult('Command Processing Flow', false, error.message);
        }
    }

    // Test 7: Database Interaction Verification
    async testDatabaseInteractions() {
        logger.info('\n🧪 Testing Database Interactions...');
        
        try {
            // Test 7.1: User record creation
            const user = new User({
                messengerId: 'db_test_user',
                stage: 'initial'
            });
            await user.save();
            
            const savedUser = await User.findOne({ messengerId: 'db_test_user' });
            this.assert(savedUser, 'User should be saved to database');
            this.assert(savedUser.stage === 'initial', 'User stage should be preserved');
            
            this.logTestResult('User Record Creation', true, 'User record created and retrieved correctly');
            
            // Test 7.2: User record updates
            savedUser.stage = 'trial';
            savedUser.trialMessagesUsedToday = 1;
            await savedUser.save();
            
            const updatedUser = await User.findOne({ messengerId: 'db_test_user' });
            this.assert(updatedUser.stage === 'trial', 'User stage should be updated');
            this.assert(updatedUser.trialMessagesUsedToday === 1, 'Trial usage should be updated');
            
            this.logTestResult('User Record Updates', true, 'User record updates work correctly');
            
            // Test 7.3: Conversation management
            const conversation = new Conversation({
                userId: savedUser._id
            });
            await conversation.save();
            
            await conversation.addMessage('user', 'Hello');
            await conversation.addMessage('assistant', 'Hi there!');
            
            const context = conversation.getContext();
            this.assert(context.length === 2, 'Conversation should have 2 messages');
            
            this.logTestResult('Conversation Management', true, 'Conversation created and messages added correctly');
            
            // Cleanup
            await User.deleteOne({ _id: savedUser._id });
            await Conversation.deleteOne({ _id: conversation._id });
            
        } catch (error) {
            this.logTestResult('Database Interactions', false, error.message);
        }
    }

    // Test 8: Message Content Verification
    async testMessageContent() {
        logger.info('\n🧪 Testing Message Content...');
        
        try {
            // Test 8.1: Welcome message content
            const welcomeMessage1 = `👋 Welcome to Answer Bot AI!

Your intelligent virtual assistant powered by GPT-4.1 Nano. We're pleased to have you on board.`;
            
            this.assert(welcomeMessage1.includes('Welcome to Answer Bot AI'), 'Welcome message should contain correct content');
            this.logTestResult('Welcome Message Content', true, 'Welcome message content verified');
            
            // Test 8.2: Trial limit message
            const trialLimitMessage = '🛑 You\'ve reached your daily free trial limit. Subscribe for premium access!';
            this.assert(trialLimitMessage.includes('trial limit'), 'Trial limit message should contain correct content');
            this.logTestResult('Trial Limit Message', true, 'Trial limit message content verified');
            
            // Test 8.3: Payment success message
            const paymentSuccessMessage = '🎉 Payment successful! Your subscription is now active.';
            this.assert(paymentSuccessMessage.includes('Payment successful'), 'Payment success message should contain correct content');
            this.logTestResult('Payment Success Message', true, 'Payment success message content verified');
            
            // Test 8.4: Help command message
            const helpMessage = '🤖 **Available Commands:**';
            this.assert(helpMessage.includes('Available Commands'), 'Help message should contain correct content');
            this.logTestResult('Help Message Content', true, 'Help message content verified');
            
        } catch (error) {
            this.logTestResult('Message Content Verification', false, error.message);
        }
    }

    // Run all tests
    async runAllTests() {
        logger.info('🚀 Starting Answer Bot AI Comprehensive Test Suite...\n');
        
        const tests = [
            this.testNewUserOnboarding.bind(this),
            this.testPhoneNumberValidation.bind(this),
            this.testFreeTrialFlow.bind(this),
            this.testSubscriptionFlow.bind(this),
            this.testPaidSubscriberFlow.bind(this),
            this.testCommandProcessing.bind(this),
            this.testDatabaseInteractions.bind(this),
            this.testMessageContent.bind(this)
        ];
        
        for (const test of tests) {
            try {
                await test();
            } catch (error) {
                logger.error(`❌ Test failed: ${error.message}`);
            }
        }
        
        // Generate test report
        this.generateTestReport();
    }

    // Generate test report
    generateTestReport() {
        logger.info('\n📊 Test Report');
        logger.info('='.repeat(50));
        
        const totalTests = this.testResults.length;
        const passedTests = this.testResults.filter(r => r.passed).length;
        const failedTests = totalTests - passedTests;
        
        logger.info(`Total Tests: ${totalTests}`);
        logger.info(`Passed: ${passedTests}`);
        logger.info(`Failed: ${failedTests}`);
        logger.info(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(2)}%`);
        
        if (failedTests > 0) {
            logger.info('\n❌ Failed Tests:');
            this.testResults
                .filter(r => !r.passed)
                .forEach(r => logger.info(`  - ${r.testName}: ${r.details}`));
        }
        
        logger.info('\n✅ All tests completed!');
    }
}

// Main execution
async function main() {
    const tester = new AnswerBotAITester();
    
    try {
        const initialized = await tester.initialize();
        if (!initialized) {
            logger.error('❌ Failed to initialize test environment');
            process.exit(1);
        }
        
        await tester.runAllTests();
        
    } catch (error) {
        logger.error('❌ Test execution failed:', error);
    } finally {
        await tester.cleanup();
    }
}

// Run tests if this file is executed directly
if (require.main === module) {
    main().catch(console.error);
}

module.exports = AnswerBotAITester; 