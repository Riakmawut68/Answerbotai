const logger = require('../utils/logger');
const Validators = require('../utils/validators');
const config = require('../config');
const User = require('../models/user');
const messengerService = require('./messengerService');

class CommandService {
    constructor() {
        this.commands = {
            'cancel': this.handleCancel.bind(this),
            'start': this.handleStart.bind(this),
            'help': this.handleHelp.bind(this)
        };
    }

    // Process user command
    async processCommand(user, messageText) {
        try {
            // Extract command from message
            const command = this.extractCommand(messageText);
            
            if (!command) {
                return { isCommand: false };
            }

            // Validate command
            const validation = Validators.validateCommand(command);
            if (!validation.isValid) {
                logger.warn(`Invalid command from user ${user.messengerId}: ${command}`);
                await messengerService.sendText(user.messengerId, 
                    `Invalid command. Available commands: ${Object.keys(this.commands).join(', ')}`
                );
                return { isCommand: true, handled: false };
            }

            logger.info(`Processing command "${command}" from user ${user.messengerId}`);

            // Execute command
            const result = await this.commands[command](user, messageText);
            
            return { isCommand: true, handled: true, result };

        } catch (error) {
            logger.error(`Error processing command for user ${user.messengerId}:`, error);
            await messengerService.sendText(user.messengerId, 
                'Sorry, there was an error processing your command. Please try again.'
            );
            return { isCommand: true, handled: false, error: error.message };
        }
    }

    // Extract command from message
    extractCommand(messageText) {
        if (!messageText || typeof messageText !== 'string') {
            return null;
        }

        const cleanMessage = messageText.trim().toLowerCase();
        
        // Check if message starts with a command
        for (const command of Object.keys(this.commands)) {
            if (cleanMessage === command || cleanMessage.startsWith(`${command} `)) {
                return command;
            }
        }

        return null;
    }

    // Handle "resetme" command - Reset user's daily usage
    async handleResetMe(user, messageText) {
        logger.info(`User ${user.messengerId} requested reset`);

        // Fix invalid stage if needed
        if (user.stage === 'phone_verified') {
            user.stage = 'trial';
            logger.info(`Fixed user ${user.messengerId} stage: phone_verified → trial`);
        }

        // Reset daily usage
        user.trialMessagesUsedToday = 0;
        user.dailyMessageCount = 0;
        user.lastTrialResetDate = new Date();
        user.lastMessageCountResetDate = new Date();
        
        await user.save();

        await messengerService.sendText(user.messengerId,
            '✅ Your daily usage has been reset!\n\n' +
            'You can now use your messages again:\n' +
            `• Trial users: ${config.limits.trialMessagesPerDay} messages per day\n` +
            `• Subscribers: ${config.limits.subscriptionMessagesPerDay} messages per day\n\n` +
            'Your conversation history has also been cleared.'
        );

        return { success: true, action: 'reset' };
    }

    // Handle "cancel" command - Cancel current operation
    async handleCancel(user, messageText) {
        logger.paymentCancelled(user.messengerId);

        // Fix invalid stage if needed
        if (user.stage === 'phone_verified') {
            user.stage = 'trial';
            logger.info(`Fixed user ${user.messengerId} stage: phone_verified → trial`);
        }

        let message = '';

        if (user.stage === 'awaiting_payment') {
            // Cancel payment
            user.stage = 'trial';
            user.paymentSession = null;
            await user.save();

            message = '✅ Payment cancelled. You can continue using your trial messages or try subscribing again later.';
        } else if (user.stage === 'awaiting_phone') {
            // Cancel phone registration
            user.stage = 'initial';
            user.mobileNumber = null;
            await user.save();

            message = '✅ Phone registration cancelled. You can start over by sending "start".';
        } else {
            message = 'There\'s nothing to cancel right now. You can use "help" to see available commands.';
        }

        await messengerService.sendText(user.messengerId, message);
        return { success: true, action: 'cancel' };
    }

    // Handle "start" command - Restart onboarding
    async handleStart(user, messageText) {
        logger.info(`User ${user.messengerId} requested restart`);

        // Reset user to initial state
        user.stage = 'initial';
        user.consentTimestamp = null;
        user.mobileNumber = null;
        user.trialMessagesUsedToday = 0;
        user.dailyMessageCount = 0;
        user.hasUsedTrial = false;
        user.trialStartDate = null;
        user.paymentSession = null;
        user.subscription = {
            plan: 'none',
            status: 'none'
        };

        await user.save();

        // Send welcome message
        await messengerService.sendWelcomeMessage(user.messengerId);

        return { success: true, action: 'restart' };
    }

    // Handle "help" command - Show professional help guide
    async handleHelp(user, messageText) {
        logger.info(`User ${user.messengerId} requested help`);

        const helpMessage = 
            '🤖 **Answer Bot AI - Help & Support Guide**\n\n' +
            'Welcome to Answer Bot AI! Here\'s everything you need to know to get the most out of our intelligent assistant.\n\n' +
            '📚 **How to Use Answer Bot AI:**\n\n' +
            '• **Ask Any Question**: Simply type your question and get intelligent, AI-powered responses\n' +
            '• **Academic Support**: Get help with homework, research, and educational topics\n' +
            '• **Business Guidance**: Receive insights on business strategies, market analysis, and professional advice\n' +
            '• **Health Information**: Access general health knowledge and wellness tips\n' +
            '• **Agricultural Support**: Get farming advice, crop management tips, and agricultural insights\n' +
            '• **General Knowledge**: Explore any topic with comprehensive, accurate information\n\n' +
            '💡 **Best Practices:**\n\n' +
            '• **Be Specific**: The more detailed your question, the better the response\n' +
            '• **Ask Follow-ups**: Build on previous answers for deeper understanding\n' +
            '• **Use Clear Language**: Write clearly to get the most accurate responses\n' +
            '• **Respect Limits**: Be mindful of your daily message allowance\n\n' +
            '🆓 **Free Trial & Subscription:**\n\n' +
            '• **Free Trial**: New users get 3 messages per day to explore our service\n' +
            '• **Premium Access**: Subscribe for 30 messages per day with enhanced features\n' +
            '• **Pricing**:\n' +
            `  - Weekly Plan: ${config.momo.displayAmounts.weekly.toLocaleString()} ${config.momo.displayCurrency} (30 messages/day)\n` +
            `  - Monthly Plan: ${config.momo.displayAmounts.monthly.toLocaleString()} ${config.momo.displayCurrency} (30 messages/day + priority support)\n\n` +
            '⚠️ **Important Information:**\n\n' +
            '• **Non-Refundable**: All subscription payments are non-refundable once access is granted\n' +
            '• **Daily Limits**: Message limits reset at midnight (Juba time)\n' +
            '• **Service Availability**: Available 24/7 for your convenience\n' +
            '• **Data Privacy**: Your conversations are private and secure\n\n' +
            '🛠 **Available Commands:**\n\n' +
            '• **start** - Restart the bot and begin fresh\n' +
            '• **cancel** - Cancel current operation (payment, registration)\n' +
            '• **help** - Show this help guide\n\n' +
            '📞 **Need More Help?**\n\n' +
            'If you have questions, need technical support, or want to report an issue, please contact our support team:\n\n' +
            '📧 **Email**: riakmawut3@gmail.com\n\n' +
            'We\'re here to help you get the most out of Answer Bot AI! 🚀';

        await messengerService.sendText(user.messengerId, helpMessage);
        return { success: true, action: 'help' };
    }

    // Handle "status" command - Show user status
    async handleStatus(user, messageText) {
        logger.info(`User ${user.messengerId} requested status`);

        // Fix invalid stage if needed
        if (user.stage === 'phone_verified') {
            user.stage = 'trial';
            logger.info(`Fixed user ${user.messengerId} stage: phone_verified → trial`);
        }

        const timezone = require('../utils/timezone');
        const currentTime = timezone.getCurrentTime();

        let statusMessage = `📊 **Your Status:**\n\n`;
        statusMessage += `🆔 **User ID:** ${user.messengerId}\n`;
        statusMessage += `📱 **Mobile:** ${user.mobileNumber || 'Not registered'}\n`;
        statusMessage += `📋 **Stage:** ${user.stage}\n`;
        statusMessage += `📅 **Current Time:** ${currentTime.format('YYYY-MM-DD HH:mm:ss')}\n\n`;

        if (user.subscription.plan === 'none') {
            statusMessage += `🆓 **Trial Status:**\n`;
            statusMessage += `• Messages used today: ${user.trialMessagesUsedToday}/${config.limits.trialMessagesPerDay}\n`;
            statusMessage += `• Trial used: ${user.hasUsedTrial ? 'Yes' : 'No'}\n`;
        } else {
            statusMessage += `💳 **Subscription Status:**\n`;
            statusMessage += `• Plan: ${user.subscription.plan}\n`;
            statusMessage += `• Status: ${user.subscription.status}\n`;
            statusMessage += `• Messages used today: ${user.dailyMessageCount}/${config.limits.subscriptionMessagesPerDay}\n`;
            
            if (user.subscription.expiryDate) {
                const expiryDate = timezone.toJubaTime(user.subscription.expiryDate);
                statusMessage += `• Expires: ${expiryDate.format('YYYY-MM-DD HH:mm:ss')}\n`;
            }
        }

        await messengerService.sendText(user.messengerId, statusMessage);
        return { success: true, action: 'status' };
    }
}

module.exports = new CommandService(); 