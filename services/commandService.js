const logger = require('../utils/logger');
const Validators = require('../utils/validators');
const config = require('../config');
const User = require('../models/user');
const messengerService = require('./messengerService');

class CommandService {
    constructor() {
        this.commands = {
            'resetme': this.handleResetMe.bind(this),
            'cancel': this.handleCancel.bind(this),
            'start': this.handleStart.bind(this),
            'help': this.handleHelp.bind(this),
            'delete my data': this.handleDeleteMyData.bind(this)
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
        
        // Check for exact matches first (including multi-word commands)
        for (const command of Object.keys(this.commands)) {
            if (cleanMessage === command) {
                return command;
            }
        }

        // Check if message starts with a command
        for (const command of Object.keys(this.commands)) {
            if (cleanMessage.startsWith(`${command} `)) {
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

        // User-safe restart: preserve consent, phone, and any active subscription
        const hasActiveSubscription = user.subscription && user.subscription.status === 'active';
        const hasGivenConsent = Boolean(user.consentTimestamp);

        // Always clear transient sessions and reset daily counters
        user.paymentSession = null;
        user.trialMessagesUsedToday = 0;
        user.dailyMessageCount = 0;

        if (hasActiveSubscription) {
            user.stage = 'subscribed';
            await user.save();
            await messengerService.sendText(user.messengerId,
                '🔄 Restarted. Your subscription is active — you can start asking questions now.\n\nType "help" to see commands.'
            );
            return { success: true, action: 'restart' };
        }

        if (hasGivenConsent) {
            user.stage = 'trial';
            await user.save();
            await messengerService.sendText(user.messengerId,
                '🔄 Restarted. You can continue using your trial.\n\nType "help" to see commands.'
            );
            return { success: true, action: 'restart' };
        }

        // New user or no consent yet: start onboarding from the beginning
        user.stage = 'initial';
        await user.save();
        await messengerService.sendWelcomeMessage(user.messengerId);
        return { success: true, action: 'restart' };
    }

    // Handle "help" command - Show professional help guide
    async handleHelp(user, messageText) {
        logger.info(`User ${user.messengerId} requested help`);

        const helpMessage = 
            '🤖 Answer Bot AI – Help Guide\n\n' +
            '📚 How to Use\n\n' +
            'Ask questions on academics, business, health, agriculture, or general knowledge\n\n' +
            'Keep questions clear & specific for the best answers\n\n' +
            '🆓 Free vs. Premium\n\n' +
            'Free: 3 messages/day (new users)\n' +
            'Premium: 30 messages/day\n' +
            `Weekly: ${config.momo.displayAmounts.weekly.toLocaleString()} ${config.momo.displayCurrency}\n` +
            `Monthly: ${config.momo.displayAmounts.monthly.toLocaleString()} ${config.momo.displayCurrency}\n\n` +
            '⚠️ Important Notes\n\n' +
            'Payments are non-refundable\n' +
            'Daily limits reset at midnight (Juba time)\n' +
            'Available 24/7\n\n' +
            '🔧 Commands\n\n' +
            'start – Restart the bot\n' +
            'cancel – Stop current action\n' +
            'help – Show this guide again\n' +
            'delete my data – Request data deletion\n\n' +
            '📧 Support: riakmawut3@gmail.com';

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

    // Handle "delete my data" command - Process data deletion request
    async handleDeleteMyData(user, messageText) {
        logger.info(`User ${user.messengerId} requested data deletion`);

        // Send confirmation message
        const deletionMessage = 
            '🗑️ **Data Deletion Request Received**\n\n' +
            'We have received your request to delete your data.\n\n' +
            '📋 **What will be deleted:**\n' +
            '• Your Messenger ID\n' +
            '• Message count history\n' +
            '• Subscription information\n' +
            '• Phone number (if provided)\n' +
            '• All conversation data\n\n' +
            '⚠️ **Important:**\n' +
            '• This action cannot be undone\n' +
            '• You will lose access to your subscription\n' +
            '• You will need to start over if you return\n\n' +
            '🔒 **Data will be permanently deleted within 24 hours**\n\n' +
            '📧 **For immediate deletion, contact:**\n' +
            'riakmawut3@gmail.com\n\n' +
            'Thank you for using Answer Bot AI.';

        await messengerService.sendText(user.messengerId, deletionMessage);

        // Mark user for deletion (will be processed by cleanup service)
        user.markedForDeletion = true;
        user.deletionRequestedAt = new Date();
        await user.save();

        return { success: true, action: 'delete_data_requested' };
    }
}

module.exports = new CommandService(); 