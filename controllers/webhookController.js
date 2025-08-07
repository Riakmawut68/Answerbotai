const logger = require('../utils/logger');
const User = require('../models/user');
const messengerService = require('../services/messengerService');
const aiService = require('../services/aiService');
const MomoService = require('../services/momoService');
const momoService = new MomoService();
const commandService = require('../services/commandService');
const Validators = require('../utils/validators');
const config = require('../config');

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

            logger.info(`📨 Received webhook event: ${body.object || 'unknown'}`);
            if (body.entry && body.entry.length > 0) {
                logger.info(`📝 Processing ${body.entry.length} entry/entries`);
            }

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
            logger.error('❌ Error handling webhook event:', error);
            // Already sent 200 OK to Facebook
        }
    },

    // Handle payment callbacks from MTN MoMo
    handlePaymentCallback: async (req, res) => {
        try {
            const { body } = req;
            logger.info('💰 Payment callback received:', body);

            // Process the callback using the enhanced MomoService
            const result = await momoService.handlePaymentCallback(body);
            
            if (result.success) {
                // Find user by payment reference to send notification
                const user = await User.findOne({ 
                    'paymentSession.reference': body.reference 
                });

                if (user && body.status === 'SUCCESSFUL') {
                    // Send success message
                    await messengerService.sendText(user.messengerId,
                        '🎉 Payment successful! Your subscription is now active.\n\n' +
                        'You can now send up to 30 messages per day. Enjoy using Answer Bot AI!'
                    );

                    logger.subscriptionActivated(user.messengerId, user.subscription.planType);
                } else if (user && body.status === 'FAILED') {
                    // Send failure message
                    await messengerService.sendText(user.messengerId,
                        '❌ Payment failed. You can continue using your trial messages or try subscribing again later.'
                    );
                    
                    logger.paymentFailed(user.messengerId, 'Payment failed');
                }
            }

            res.status(200).json({ status: 'OK' });
        } catch (error) {
            logger.error('❌ Error handling payment callback:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
};

// Handle individual messages
async function handleMessage(event) {
    try {
        const senderId = event.sender.id;
        logger.info(`👤 Processing message from user: ${senderId}`);

        // Get or create user
        let user = await User.findOne({ messengerId: senderId });
        if (!user) {
            logger.userRegistered(senderId);
            user = new User({ messengerId: senderId });
            await user.save();
            // Send welcome message for new users
            await sendWelcomeMessage(senderId);
            return;
        }

        // Handle message events
        if (event.message && event.message.text) {
            const messageText = event.message.text;
            logger.info(`📝 User message: "${messageText}" | Stage: ${user.stage} | Trial messages: ${user.trialMessagesUsedToday}/${config.limits.trialMessagesPerDay}`);
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
            logger.info(`❌ User ${user.messengerId} hasn't given consent yet`);
            return;
        }

        // Check for commands first
        const commandResult = await commandService.processCommand(user, messageText);
        if (commandResult.isCommand) {
            if (commandResult.handled) {
                logger.info(`✅ Command processed successfully for user ${user.messengerId}`);
                return;
            } else {
                logger.warn(`❌ Command processing failed for user ${user.messengerId}`);
                return;
            }
        }

        // Handle different stages of user flow
        logger.info(`🔄 Processing user stage: ${user.stage}`);
        switch(user.stage) {
            case 'awaiting_phone':
                const mobileValidation = Validators.validateMobileNumber(messageText);
                if (mobileValidation.isValid) {
                    // Check if number has been used before
                    const existingUser = await User.findOne({ mobileNumber: mobileValidation.value });
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
                                 title: `Weekly Plan ${config.momo.displayAmounts.weekly.toLocaleString()} ${config.momo.displayCurrency}`,
                                 payload: 'SUBSCRIBE_WEEKLY'
                             },
                             {
                                 type: 'postback',
                                 title: `Monthly Plan ${config.momo.displayAmounts.monthly.toLocaleString()} ${config.momo.displayCurrency}`,
                                 payload: 'SUBSCRIBE_MONTHLY'
                             }
                         ];
                        await messengerService.sendButtonTemplate(user.messengerId, 
                            'Choose an option to continue:', 
                            buttons
                        );
                    } else {
                        user.mobileNumber = mobileValidation.value;
                        user.stage = 'trial';
                        user.hasUsedTrial = true;
                        user.trialStartDate = new Date();
                        await user.save();
                        await messengerService.sendText(user.messengerId, 
                            '✅ Your number has been registered. You can now use your daily free trial of 3 messages.\n\n' +
                            'Try asking me anything!'
                        );
                    }
                } else {
                    await messengerService.sendText(user.messengerId, 
                        `❌ ${mobileValidation.error}`
                    );
                }
                return;

            case 'awaiting_phone_for_payment':
                const mobileValidationPayment = Validators.validateMobileNumber(messageText);
                if (mobileValidationPayment.isValid) {
                    // For payment, accept any valid MTN number without checking trial usage
                    user.paymentMobileNumber = mobileValidationPayment.value;
                    await user.save();
                    
                    // Initiate payment first (default to last selected plan, or ask user to select again if not tracked)
                    // For simplicity, default to weekly plan if not tracked
                    let planType = user.lastSelectedPlanType || 'weekly';
                    try {
                        const paymentResult = await momoService.initiatePayment(user, planType);
                        if (paymentResult.success) {
                            // ✅ Only send payment processing message when payment request is successful (202 status)
                            await messengerService.sendText(user.messengerId,
                                '⏳ Your payment is being processed.\n\n' +
                                'Please check your phone for a payment prompt. Complete the transaction within 15 minutes.\n\n' +
                                'Type "cancel" to cancel this payment.'
                            );
                            
                            user.stage = 'awaiting_payment';
                            await user.save();
                            
                            logger.info(`🚀 Payment request initiated for user ${user.messengerId}`, {
                                planType,
                                amount: paymentResult.amount,
                                reference: paymentResult.reference
                            });
                        } else {
                            await messengerService.sendText(user.messengerId,
                                'Sorry, there was an error processing your payment request. Please try again in a moment.'
                            );
                        }
                    } catch (error) {
                        logger.error('Payment initiation error:', error);
                        await messengerService.sendText(user.messengerId,
                            'Sorry, there was an error processing your payment request. Please try again in a moment.'
                        );
                    }
                } else {
                    await messengerService.sendText(user.messengerId, 
                        `❌ ${mobileValidationPayment.error}`
                    );
                }
                return;

            case 'awaiting_payment':
                // User is in payment flow, ignore text messages
                await messengerService.sendText(user.messengerId, 'Please complete your payment to continue.');
                return;

            case 'trial':
                // Trial stage - proceed to message processing
                break;

            case 'subscribed':
                // Check subscription limits
                if (user.dailyMessageCount >= config.limits.subscriptionMessagesPerDay) {
                    await messengerService.sendText(user.messengerId, 'You\'ve reached your daily message limit. Try again tomorrow!');
                    return;
                }
                break;

            case 'subscription_expired':
                await messengerService.sendText(user.messengerId, 'Your subscription has expired. Please renew to continue using the service.');
                await sendSubscriptionOptions(user.messengerId);
                return;
        }

        // Check subscription expiry in real-time
        if (user.subscription.planType !== 'none') {
            const now = new Date();
            if (user.subscription.expiryDate < now) {
                // Update status immediately
                user.subscription.status = 'expired';
                user.stage = 'subscription_expired';
                await user.save();
                
                logger.info(`⏰ User ${user.messengerId} subscription expired in real-time check`);
                
                // Block message and show expiry message
                await messengerService.sendText(user.messengerId, 
                    'Your subscription has expired. Please renew to continue using the service.'
                );
                await sendSubscriptionOptions(user.messengerId);
                return;
            }
        }

        // Check message limits
        logger.info(`📊 Message limits check - Plan: ${user.subscription.planType}, Trial used: ${user.trialMessagesUsedToday}, Daily count: ${user.dailyMessageCount}`);
        
        if (user.subscription.planType === 'none') {
            // Free trial logic
            if (user.trialMessagesUsedToday >= config.limits.trialMessagesPerDay) {
                logger.trialLimitReached(user.messengerId, user.trialMessagesUsedToday);
                await messengerService.sendText(user.messengerId, 
                    '🛑 You\'ve reached your daily free trial limit. Subscribe for premium access!'
                );
                await sendSubscriptionOptions(user.messengerId);
                return;
            }
            user.trialMessagesUsedToday += 1;
            logger.info(`✅ Trial message count updated: ${user.trialMessagesUsedToday}/${config.limits.trialMessagesPerDay}`);
        } else {
            // Paid subscription logic
            if (user.dailyMessageCount >= config.limits.subscriptionMessagesPerDay) {
                logger.info(`🛑 User ${user.messengerId} reached daily limit (${config.limits.subscriptionMessagesPerDay} messages)`);
                await messengerService.sendText(user.messengerId, 'You\'ve reached your daily message limit. Try again tomorrow!');
                return;
            }
            user.dailyMessageCount += 1;
            logger.info(`✅ Daily message count updated: ${user.dailyMessageCount}/${config.limits.subscriptionMessagesPerDay}`);
        }

        await user.save();
        logger.info(`🚀 Proceeding to AI response generation`);

        try {
            // Generate AI response with consistent formatting instructions
            const aiResponse = await aiService.generateUserResponse(messageText);
            
            // Send response to user
            await messengerService.sendText(user.messengerId, aiResponse);
            
            logger.info(`✅ AI response sent successfully to user ${user.messengerId}`);
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
    const config = require('../config');
    
    await messengerService.sendText(userId,
        'To continue using Answer Bot AI, please choose a subscription plan:\n\n' +
        `- ${config.momo.displayAmounts.weekly.toLocaleString()} ${config.momo.displayCurrency} Weekly: 30 messages/day, standard features\n` +
        `- ${config.momo.displayAmounts.monthly.toLocaleString()} ${config.momo.displayCurrency} Monthly: 30 messages/day, extended features & priority service`
    );

    const buttons = [
        {
            type: 'postback',
            title: `Weekly Plan ${config.momo.displayAmounts.weekly.toLocaleString()} ${config.momo.displayCurrency}`,
            payload: 'SUBSCRIBE_WEEKLY'
        },
        {
            type: 'postback',
            title: `Monthly Plan ${config.momo.displayAmounts.monthly.toLocaleString()} ${config.momo.displayCurrency}`,
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
                // Save last selected plan type for use after phone collection
                user.lastSelectedPlanType = planType;
                // Clear any existing payment mobile number and ask for a new one
                user.paymentMobileNumber = null;
                user.stage = 'awaiting_phone_for_payment';
                await user.save();
                await messengerService.sendText(user.messengerId,
                    'To continue, please enter your MTN mobile number (e.g., 092xxxxxxx) for payment processing.'
                );
                break;

            case 'RETRY_NUMBER':
                // Check if user is in payment flow or trial flow
                if (user.stage === 'awaiting_phone_for_payment') {
                    user.paymentMobileNumber = null;
                    await user.save();
                    await messengerService.sendText(user.messengerId,
                        'Please enter a different MTN mobile number (e.g., 092xxxxxxx) for payment processing.'
                    );
                } else {
                    user.stage = 'awaiting_phone';
                    user.mobileNumber = null;
                    await user.save();
                    await messengerService.sendText(user.messengerId,
                        'Please enter a different MTN mobile number (e.g., 092xxxxxxx).\n\n' +
                        'Make sure this number hasn\'t been used for a trial before.'
                    );
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
