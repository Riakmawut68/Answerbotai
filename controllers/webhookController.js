const logger = require('../utils/logger');
const User = require('../models/user');
const messengerService = require('../services/messengerService');
const aiService = require('../services/aiService');
const momoService = require('../services/momoService');

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

        // Handle different stages of user flow
        switch(user.stage) {
            case 'awaiting_phone':
                if (messageText.match(/^092\d{7}$/)) {
                    // Check if number has been used before
                    const existingUser = await User.findOne({ mobileNumber: messageText });
                    if (existingUser && existingUser.hasUsedTrial) {
                        await messengerService.sendText(user.messengerId, 
                            '⚠️ This MTN number has already been used for a free trial.\n\n' +
                            'Please try a different number or subscribe to unlock full access.'
                        );
                        const buttons = [
                            {
                                type: 'postback',
                                title: 'Try Different Number',
                                payload: 'RETRY_NUMBER'
                            },
                            {
                                type: 'postback',
                                title: 'Weekly Plan 3,000 SSP',
                                payload: 'SUBSCRIBE_WEEKLY'
                            },
                            {
                                type: 'postback',
                                title: 'Monthly Plan 6,500 SSP',
                                payload: 'SUBSCRIBE_MONTHLY'
                            }
                        ];
                        await messengerService.sendButtonTemplate(user.messengerId, 
                            'Choose an option to continue:', 
                            buttons
                        );
                    } else {
                        user.mobileNumber = messageText;
                        user.stage = 'phone_verified';
                        await user.save();
                        await messengerService.sendText(user.messengerId, 
                            '✅ Your number has been registered. You can now use your daily free trial of 3 messages.'
                        );
                    }
                } else {
                    await messengerService.sendText(user.messengerId, 
                        'Sorry, that doesn\'t look like a valid MTN South Sudan number. Please enter a number starting with 092 (e.g., 092xxxxxxx).'
                    );
                }
                return;

            case 'awaiting_payment':
                // User is in payment flow, ignore text messages
                await messengerService.sendText(user.messengerId, 'Please complete your payment to continue.');
                return;

            case 'trial':
                // Reset daily trial count
                await user.resetDailyTrialCount();
                if (user.trialMessagesRemaining <= 0) {
                    await messengerService.sendText(user.messengerId, 
                        '🛑 You\'ve reached your daily free trial limit (3 messages).\n\n' +
                        'You have reached your free daily limit. Subscribe for premium access:\n\n' +
                        '- 3,000 SSP Weekly: 30 messages/day, standard features\n' +
                        '- 6,500 SSP Monthly: 30 messages/day, extended features & priority service'
                    );
                    await sendSubscriptionOptions(user.messengerId);
                    return;
                }
                break;

            case 'subscription_active':
                // Reset daily message count for subscribers
                await user.resetDailyMessageCount();
                if (user.dailyMessageCount >= user.dailyMessageLimit) {
                    await messengerService.sendText(user.messengerId, 'You\'ve reached your daily message limit. Try again tomorrow!');
                    return;
                }
                break;

            case 'subscription_expired':
                await messengerService.sendText(user.messengerId, 'Your subscription has expired. Please renew to continue using the service.');
                await sendSubscriptionOptions(user.messengerId);
                return;
        }

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

// Send subscription options
async function sendSubscriptionOptions(userId) {
    await messengerService.sendText(userId,
        'To continue using Answer Bot AI, please choose a subscription plan:\n\n' +
        '- 3,000 SSP Weekly: 30 messages/day, standard features\n' +
        '- 6,500 SSP Monthly: 30 messages/day, extended features & priority service'
    );

    const buttons = [
        {
            type: 'postback',
            title: 'Weekly Plan 3,000 SSP',
            payload: 'SUBSCRIBE_WEEKLY'
        },
        {
            type: 'postback',
            title: 'Monthly Plan 6,500 SSP',
            payload: 'SUBSCRIBE_MONTHLY'
        }
    ];

    await messengerService.sendButtonTemplate(userId, 
        'Select your preferred plan:', 
        buttons
    );
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
                user.stage = 'awaiting_phone';
                await user.save();
                await messengerService.sendText(user.messengerId, 
                    'Thank you for accepting our terms and conditions.\n\n' +
                    'To continue, please enter your own MTN mobile number (e.g., 092xxxxxxx).\n\n' +
                    'Providing your number helps us verify your eligibility for the free trial and ensures the security of your account.'
                );
                break;

            case 'SUBSCRIBE_WEEKLY':
            case 'SUBSCRIBE_MONTHLY':
                const planType = payload === 'SUBSCRIBE_WEEKLY' ? 'weekly' : 'monthly';
                try {
                    const paymentResult = await momoService.initiatePayment(user, planType);
                    if (paymentResult.success) {
                        user.stage = 'awaiting_payment';
                        await user.save();
                        await messengerService.sendText(user.messengerId,
                            '⏳ Your payment is being processed.\n\n' +
                            'Please check your phone for a payment prompt. Complete the transaction within 15 minutes.\n\n' +
                            'Type "cancel" to cancel this payment.'
                        );
                    }
                } catch (error) {
                    logger.error('Payment initiation error:', error);
                    await messengerService.sendText(user.messengerId,
                        'Sorry, there was an error processing your payment request. Please try again in a moment.'
                    );
                }
                break;

            case 'START_TRIAL':
                if (!user.hasUsedTrial) {
                    user.stage = 'trial';
                    user.hasUsedTrial = true;
                    user.trialStartDate = new Date();
                    await user.save();
                    await messengerService.sendText(user.messengerId,
                        'Welcome to your free trial! You can send up to 3 messages per day. Try it out now!'
                    );
                } else {
                    await messengerService.sendText(user.messengerId,
                        'You\'ve already used your free trial. Please subscribe to continue using the service.'
                    );
                    await sendSubscriptionOptions(user.messengerId);
                }
                break;
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
