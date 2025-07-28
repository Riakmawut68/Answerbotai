const logger = require('../utils/logger');
const User = require('../models/user');
const messengerService = require('../services/messengerService');
const aiService = require('../services/aiService');

const webhookController = {
    // Verify webhook for Facebook
    verify: (req, res) => {
        const mode = req.query['hub.mode'];
        const token = req.query['hub.verify_token'];
        const challenge = req.query['hub.challenge'];

        if (mode && token) {
            if (mode === 'subscribe' && token === process.env.VERIFY_TOKEN) {
                logger.info('Webhook verified');
                return res.status(200).send(challenge);
            }
            return res.sendStatus(403);
        }
    },

    // Handle incoming webhook events
    handleEvent: async (req, res) => {
        try {
            const { body } = req;

            // Return 200 OK for all webhook events
            res.status(200).send('OK');

            if (body.object === 'page') {
                for (const entry of body.entry) {
                    for (const event of entry.messaging) {
                        await handleMessage(event);
                    }
                }
            }
        } catch (error) {
            logger.error('Error handling webhook event:', error);
            // Already sent 200 OK to Facebook
        }
    }
};

// Handle individual messages
async function handleMessage(event) {
    try {
        const senderId = event.sender.id;

        // Get or create user
        let user = await User.findOne({ messengerId: senderId });
        if (!user) {
            user = new User({ messengerId: senderId });
            await user.save();
            // Send welcome message for new users
            await sendWelcomeMessage(senderId);
            return;
        }

        // Handle message events
        if (event.message && event.message.text) {
            const messageText = event.message.text;
            await processUserMessage(user, messageText);
        }

        // Handle postback events (button clicks)
        if (event.postback && event.postback.payload) {
            await handlePostback(user, event.postback.payload);
        }

    } catch (error) {
        logger.error('Error in handleMessage:', error);
    }
}

// Process user messages
async function processUserMessage(user, messageText) {
    try {
        // Check user consent
        if (!user.consentTimestamp) {
            // User hasn't given consent yet
            return;
        }

        // Check if phone number is registered
        if (!user.mobileNumber) {
            // Validate phone number if provided
            if (messageText.match(/^092\d{7}$/)) {
                user.mobileNumber = messageText;
                await user.save();
                // Send confirmation message
            } else {
                // Send invalid phone number message
            }
            return;
        }

        // Reset daily counts
        await user.resetDailyTrialCount();
        await user.resetDailyMessageCount();

        // Check message limits
        if (user.subscription.plan === 'none') {
            // Free trial logic
            if (user.trialMessagesUsedToday >= 3) {
                // Send subscription prompt
                return;
            }
            user.trialMessagesUsedToday += 1;
        } else {
            // Paid subscription logic
            if (user.dailyMessageCount >= 30) {
                // Send daily limit reached message
                return;
            }
            user.dailyMessageCount += 1;
        }

        await user.save();

        try {
            // Check if content is appropriate
            const isAppropriate = await aiService.isAppropriateContent(messageText);
            if (!isAppropriate) {
                await messengerService.sendText(user.messengerId, 
                    "I apologize, but I cannot process that request as it may contain inappropriate content. Please ensure your message follows our content guidelines.");
                return;
            }

            // Generate AI response
            const aiResponse = await aiService.getFormattedResponse(messageText);
            await messengerService.sendText(user.messengerId, aiResponse);
        } catch (error) {
            logger.error('Error getting AI response:', error);
            await messengerService.sendText(user.messengerId, 
                "I apologize, but I'm having trouble processing your request right now. Please try again in a moment.");
        }

    } catch (error) {
        logger.error('Error processing message:', error);
    }
}

// Handle postback events
async function handlePostback(user, payload) {
    try {
        switch (payload) {
            case 'GET_STARTED':
                await sendWelcomeMessage(user.messengerId);
                break;
            case 'I_AGREE':
                user.consentTimestamp = new Date();
                await user.save();
                // Send phone number prompt
                break;
            // Add more postback handlers
        }
    } catch (error) {
        logger.error('Error handling postback:', error);
    }
}

// Send welcome message
async function sendWelcomeMessage(userId) {
    await messengerService.sendWelcomeMessage(userId);
}

module.exports = webhookController;
