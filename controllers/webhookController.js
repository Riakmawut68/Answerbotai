const logger = require('../utils/logger');
const User = require('../models/user');
const messengerService = require('../services/messengerService');
const aiService = require('../services/aiService');
const MomoService = require('../services/momoService');
const momoService = new MomoService();
const commandService = require('../services/commandService');
const Validators = require('../utils/validators');
const config = require('../config');
const limitService = require('../services/limitService');
const { getUserSummary, incAI } = require('../utils/metrics');

// In-memory cache for processed message IDs to prevent duplicates
// In production, this should be replaced with Redis for multi-instance deployments
const processedMessages = new Map();
const MESSAGE_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Clean up old message IDs periodically
setInterval(() => {
    const now = Date.now();
    for (const [messageId, timestamp] of processedMessages.entries()) {
        if (now - timestamp > MESSAGE_CACHE_TTL) {
            processedMessages.delete(messageId);
        }
    }
}, 60000); // Clean up every minute

const webhookController = {
    // Verify webhook for Facebook
    verify: (req, res) => {
        const mode = req.query['hub.mode'];
        const token = req.query['hub.verify_token'];
        const challenge = req.query['hub.challenge'];

        if (mode && token) {
            if (mode === 'subscribe' && token === process.env.VERIFY_TOKEN) {
                            logger.info('################################');
            logger.info('### WEBHOOK VERIFICATION ###');
            logger.info('################################');
                logger.info('✅ Webhook verified successfully');
                return res.status(200).send(challenge);
            }
            return res.sendStatus(403);
        }
    },

    // Handle incoming webhook events
    handleEvent: async (req, res) => {
        try {
            const { body } = req;

            logger.info('################################');
            logger.info('### MESSENGER WEBHOOK EVENTS ###');
            logger.info('################################');
            logger.info(`📨 [WEBHOOK RECEIVED]`);
            logger.info(`  ├── Object: ${body.object || 'unknown'}`);
            logger.info(`  └── Entries: ${body.entry ? body.entry.length : 0}`);
            
            // CRITICAL: Send 200 OK immediately to prevent Facebook retries
            res.status(200).send('OK');
            logger.info(`✅ [WEBHOOK ACKNOWLEDGMENT]`);
            logger.info(`  ├── Status: 200 OK sent to Facebook`);
            logger.info(`  └── Action: Preventing webhook retries`);
            
            if (body.entry && body.entry.length > 0) {
                // Process each entry
                for (const entry of body.entry) {
                    if (entry.messaging && entry.messaging.length > 0) {
                        for (const event of entry.messaging) {
                            // Skip echoes and system messages early in the log phase
                            if (event.message?.is_echo || event.message?.app_id) {
                                logger.info(`⏭️ [SKIPPING ECHO]`);
                                logger.info(`  ├── User: ${event.sender?.id || 'Unknown'}`);
                                logger.info(`  └── Reason: Echo or app-generated message`);
                                continue;
                            }
                            // Log event type with specific actions
                            if (event.message) {
                                logger.info(`📨 [MESSAGE RECEIVED]`);
                                logger.info(`  ├── User: ${event.sender.id}`);
                                logger.info(`  ├── Content: "${event.message.text ? event.message.text.substring(0, 100) + (event.message.text.length > 100 ? '...' : '') : 'No text'}"`);
                                logger.info(`  └── Action: Routing to message handler`);
                            } else if (event.postback) {
                                logger.info(`🔘 [POSTBACK RECEIVED]`);
                                logger.info(`  ├── User: ${event.sender.id}`);
                                logger.info(`  ├── Payload: ${event.postback.payload}`);
                                logger.info(`  └── Action: Routing to postback handler`);
                            } else if (event.delivery) {
                                logger.info(`✅ [DELIVERY CONFIRMATION]`);
                                logger.info(`  ├── Recipient: ${event.recipient.id}`);
                                logger.info(`  ├── Messages: ${event.delivery.mids ? event.delivery.mids.length : 0}`);
                                logger.info(`  └── Action: Message delivery confirmed`);
                            } else if (event.read) {
                                logger.info(`👁️ [READ CONFIRMATION]`);
                                logger.info(`  ├── Recipient: ${event.recipient.id}`);
                                logger.info(`  ├── Watermark: ${event.read.watermark ? new Date(event.read.watermark * 1000).toLocaleString() : 'N/A'}`);
                                logger.info(`  └── Action: Message read confirmed`);
                            } else {
                                logger.info(`❓ [UNKNOWN EVENT]`);
                                logger.info(`  ├── User: ${event.sender ? event.sender.id : 'Unknown'}`);
                                logger.info(`  ├── Type: ${Object.keys(event).join(', ')}`);
                                logger.info(`  └── Action: Event logged for investigation`);
                            }
                        }
                    }
                }
            }

            // Process events after sending response
            if (body.object === 'page') {
                for (const entry of body.entry) {
                    for (const event of entry.messaging) {
                        // Ignore echoes and non-user events
                        if (event.message?.is_echo || event.message?.app_id) {
                            continue;
                        }
                        // ONLY process message and postback events
                        if (event.message || event.postback) {
                            await handleMessage(event);
                            // Log per-user metrics snapshot after handling
                            try {
                                const userId = event.sender?.id;
                                if (userId) {
                                    const summary = getUserSummary(userId);
                                    logger.info(`📊 [USER METRICS]`, {
                                        userId,
                                        graph: summary.graph,
                                        ai: summary.ai
                                    });
                                }
                            } catch (e) {
                                logger.warn('Failed to log user metrics snapshot', { error: e.message });
                            }
                        } else {
                            logger.info(`⏭️ [SKIPPING SYSTEM EVENT]`);
                            logger.info(`  ├── Type: ${Object.keys(event)[0]}`);
                            logger.info(`  ├── User: ${event.sender?.id || 'Unknown'}`);
                            logger.info(`  └── Action: Event logged but not processed`);
                        }
                    }
                }
            }
        } catch (error) {
            logger.error('################################');
            logger.error('### WEBHOOK ERROR ###');
            logger.error('################################');
            logger.error(`❌ [ERROR]`);
            logger.error(`  ├── Type: Webhook processing error`);
            logger.error(`  └── Details: ${error.message}`);
        }
    },

    // Legacy payment callback removed. Use /momo/callback via momoController.
};

// Handle individual messages
async function handleMessage(event) {
    try {
        // Skip non-message events (delivery confirmations, read receipts, etc.)
        if (!event.message && !event.postback) {
            logger.info(`⏩ [SKIPPING NON-MESSAGE EVENT]`);
            logger.info(`  ├── Type: ${Object.keys(event).join(', ')}`);
            logger.info(`  ├── User: ${event.sender?.id || 'Unknown'}`);
            logger.info(`  └── Action: Event type not supported for processing`);
            return;
        }

        const senderId = event.sender.id;
        
        // Generate unique event ID for deduplication
        const eventId = event.message?.mid || event.postback?.payload || `system_${Date.now()}_${Math.random()}`;
        
        // Check for duplicate message processing
        if (processedMessages.has(eventId)) {
            logger.info(`⏭️ [DUPLICATE MESSAGE DETECTED]`);
            logger.info(`  ├── User: ${senderId}`);
            logger.info(`  ├── Event ID: ${eventId}`);
            logger.info(`  └── Action: Skipping duplicate processing`);
            return;
        }
        
        // Mark message as being processed
        processedMessages.set(eventId, Date.now());
        
        logger.info(`👤 [MESSAGE PROCESSING]`);
        logger.info(`  ├── User: ${senderId}`);
        logger.info(`  ├── Event ID: ${eventId}`);
        logger.info(`  └── Action: Processing user interaction`);

        // Get or create user atomically to prevent race conditions
        const user = await User.findOneAndUpdate(
            { messengerId: senderId },
            { 
                $setOnInsert: { 
                    messengerId: senderId,
                    stage: 'initial',
                    trialMessagesUsedToday: 0,
                    dailyMessageCount: 0,
                    subscription: {
                        planType: 'none',
                        status: 'none'
                    },
                    hasUsedTrial: false
                }
            },
            { 
                upsert: true, 
                new: true,
                runValidators: true
            }
        );

        // Check if this was a newly created user
        const isNewUser = user.createdAt && (Date.now() - user.createdAt.getTime()) < 5000; // Created within last 5 seconds
        if (isNewUser) {
            logger.info(`🆕 [NEW USER REGISTERED]`);
            logger.info(`  ├── User: ${senderId}`);
            logger.info(`  └── Action: Creating user account`);
            
            logger.userRegistered(senderId);
            // Send welcome message for new users
            await sendWelcomeMessage(senderId, { __userDoc: user });
            return;
        }

        // Handle message events
        if (event.message && event.message.text) {
            const messageText = event.message.text;
            logger.info(`📝 [USER MESSAGE]`);
            logger.info(`  ├── User: ${senderId}`);
            logger.info(`  ├── Content: "${messageText}"`);
            logger.info(`  ├── Stage: ${user.stage}`);
            logger.info(`  ├── Trial: ${user.trialMessagesUsedToday}/${config.limits.trialMessagesPerDay}`);
            logger.info(`  └── Action: Routing message to AI processor`);
            
            await processUserMessage(user, messageText);
        }

        // Handle postback events (button clicks)
        if (event.postback && event.postback.payload) {
            logger.info(`🔘 [POSTBACK PROCESSING]`);
            logger.info(`  ├── User: ${senderId}`);
            logger.info(`  ├── Payload: ${event.postback.payload}`);
            logger.info(`  └── Action: Executing button action`);
            
            await handlePostback(user, event.postback.payload);
        }

    } catch (error) {
        logger.error('################################');
        logger.error('### MESSAGE PROCESSING ERROR ###');
        logger.error('################################');
        logger.error(`❌ [ERROR]`);
        logger.error(`  ├── Type: Message processing error`);
        logger.error(`  ├── User: ${event.sender?.id || 'Unknown'}`);
        logger.error(`  └── Details: ${error.message}`);
    }
}

// Process user messages
async function processUserMessage(user, messageText) {
    try {
        // Check user consent
        if (!user.consentTimestamp) {
            logger.info(`❌ [CONSENT CHECK]`);
            logger.info(`  ├── User: ${user.messengerId}`);
            logger.info(`  ├── Status: No consent given`);
            logger.info(`  └── Action: Requesting terms acceptance`);
            return;
        }

        // Check for commands first
        const commandResult = await commandService.processCommand(user, messageText);
        if (commandResult.isCommand) {
            if (commandResult.handled) {
                logger.info(`✅ [COMMAND PROCESSED]`);
                logger.info(`  ├── User: ${user.messengerId}`);
                logger.info(`  ├── Command: ${messageText}`);
                logger.info(`  └── Action: Command completed`);
                return;
            } else {
                logger.warn(`❌ [COMMAND FAILED]`);
                logger.warn(`  ├── User: ${user.messengerId}`);
                logger.warn(`  ├── Command: ${messageText}`);
                logger.warn(`  └── Action: Command failed - fallback to AI`);
                return;
            }
        }

        // Handle different stages of user flow
        logger.info(`🔄 [STAGE PROCESSING]`);
        logger.info(`  ├── User: ${user.messengerId}`);
        logger.info(`  ├── Stage: ${user.stage}`);
        logger.info(`  └── Action: Routing to stage handler`);
        
        switch(user.stage) {
            case 'awaiting_phone':
                const mobileValidation = Validators.validateMobileNumber(messageText);
                if (mobileValidation.isValid) {
                    // Check if number has been used before
                    const existingUser = await User.findOne({ mobileNumber: mobileValidation.value });
                    if (existingUser && existingUser.hasUsedTrial) {
                        logger.info(`⚠️ [TRIAL LIMIT REACHED]`);
                        logger.info(`  ├── User: ${user.messengerId}`);
                        logger.info(`  ├── Number: ${mobileValidation.value}`);
                        logger.info(`  └── Action: Showing subscription options`);
                        
                        await messengerService.sendText(user.messengerId, 
                            '⚠️ This MTN number has already been used for a free trial.\n\n' +
                            'Please try a different number or subscribe to unlock full access.'
                        , { __userDoc: user });
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
                        , { __userDoc: user }
                        );
                    } else {
                        logger.info(`✅ [PHONE REGISTERED]`);
                        logger.info(`  ├── User: ${user.messengerId}`);
                        logger.info(`  ├── Number: ${mobileValidation.value}`);
                        logger.info(`  └── Action: Trial activated - sending welcome`);
                        
                        user.mobileNumber = mobileValidation.value;
                        user.stage = 'trial';
                        user.hasUsedTrial = true;
                        user.trialStartDate = new Date();
                        await user.save();
                        await messengerService.sendText(user.messengerId, 
                            '✅ Your number has been registered. You can now use your daily free trial of 3 messages.\n\n' +
                            'Try asking me anything!'
                        , { __userDoc: user });
                    }
                } else {
                    logger.info(`❌ [INVALID PHONE]`);
                    logger.info(`  ├── User: ${user.messengerId}`);
                    logger.info(`  ├── Input: ${messageText}`);
                    logger.info(`  ├── Error: ${mobileValidation.error}`);
                    logger.info(`  └── Action: Sending validation error`);
                    
                    await messengerService.sendText(user.messengerId, 
                        `❌ ${mobileValidation.error}`
                    , { __userDoc: user });
                }
                return;

            case 'awaiting_phone_for_payment':
                const mobileValidationPayment = Validators.validateMobileNumber(messageText);
                if (mobileValidationPayment.isValid) {
                    // For payment, accept any valid MTN number without checking trial usage
                    user.paymentMobileNumber = mobileValidationPayment.value;
                    await user.save();
                    
                    logger.info(`✅ [PAYMENT PHONE REGISTERED]`);
                    logger.info(`  ├── User: ${user.messengerId}`);
                    logger.info(`  ├── Number: ${mobileValidationPayment.value}`);
                    logger.info(`  ├── Environment: ${process.env.NODE_ENV || 'development'}`);
                    logger.info(`  ├── Is Test Number: ${config.sandbox?.testPhoneNumbers?.includes(mobileValidationPayment.value) || false}`);
                    logger.info(`  └── Action: Payment phone saved - starting payment`);
                    
                    // Initiate payment first (default to last selected plan, or ask user to select again if not tracked)
                    // For simplicity, default to weekly plan if not tracked
                    let planType = user.lastSelectedPlanType || 'weekly';
                    try {
                        logger.info(`🔄 [INITIATING PAYMENT]`, {
                            user: user.messengerId,
                            planType,
                            phoneNumber: user.paymentMobileNumber,
                            environment: process.env.NODE_ENV
                        });
                        
                        const paymentResult = await momoService.initiatePayment(user, planType);
                        
                        if (paymentResult.success) {
                            logger.info(`🚀 [PAYMENT INITIATED]`);
                            logger.info(`  ├── User: ${user.messengerId}`);
                            logger.info(`  ├── Plan: ${planType}`);
                            logger.info(`  ├── Amount: ${paymentResult.amount}`);
                            logger.info(`  ├── Reference: ${paymentResult.reference}`);
                            logger.info(`  ├── Sandbox Bypass: ${paymentResult.sandboxBypass || false}`);
                            logger.info(`  └── Action: Payment initiated - determining flow`);
                                
                                // Check if bypass was triggered and send appropriate follow-up
                                if (paymentResult.sandboxBypass) {
                                    logger.info(`🔓 [SANDBOX BYPASS DETECTED] User subscribed instantly - skipping processing message`, {
                                        user: user.messengerId,
                                        flow: 'sandbox-bypass',
                                        action: 'User can start asking questions immediately'
                                    });
                                    // Bypass completed, user already got success message from MomoService
                                    user.stage = 'subscribed'; // Set to subscribed since payment is complete
                                } else {
                                    logger.info(`⏳ [NORMAL PAYMENT FLOW] Waiting for real MTN MoMo callback`, {
                                        user: user.messengerId,
                                        flow: 'normal-payment',
                                        action: 'User must complete payment on phone'
                                    });
                                    // ✅ Send payment processing message only for normal flow
                            await messengerService.sendText(user.messengerId,
                                '⏳ Your payment is being processed.\n\n' +
                                'Please check your phone for a payment prompt. Complete the transaction within 15 minutes.\n\n' +
                                'Type "cancel" to cancel this payment.'
                            , { __userDoc: user });
                                    user.stage = 'awaiting_payment';
                                }
                            
                            await user.save();
                            
                                // Summary log for testing
                                logger.info(`📊 [PAYMENT FLOW SUMMARY]`, {
                                    user: user.messengerId,
                                    phoneNumber: user.paymentMobileNumber,
                                planType,
                                    reference: paymentResult.reference,
                                    sandboxBypass: paymentResult.sandboxBypass || false,
                                    userStage: user.stage,
                                    flow: paymentResult.sandboxBypass ? 'instant-completion' : 'awaiting-user-action',
                                    nextStep: paymentResult.sandboxBypass ? 'user-can-ask-questions' : 'user-must-complete-payment-on-phone'
                            });
                        } else {
                            logger.error(`❌ [PAYMENT INITIATION FAILED]`);
                            logger.error(`  ├── User: ${user.messengerId}`);
                            logger.error(`  ├── Plan: ${planType}`);
                            logger.error(`  └── Action: Payment failed - notifying user`);
                            
                            await messengerService.sendText(user.messengerId,
                                'Sorry, there was an error processing your payment request. Please try again in a moment.'
                            );
                        }
                    } catch (error) {
                        logger.error(`❌ [PAYMENT ERROR]`);
                        logger.error(`  ├── User: ${user.messengerId}`);
                        logger.error(`  ├── Plan: ${planType}`);
                        logger.error(`  └── Action: Payment error - notifying user`);
                        
                        await messengerService.sendText(user.messengerId,
                            'Sorry, there was an error processing your payment request. Please try again in a moment.'
                        );
                    }
                } else {
                    logger.info(`❌ [INVALID PAYMENT PHONE]`);
                    logger.info(`  ├── User: ${user.messengerId}`);
                    logger.info(`  ├── Input: ${messageText}`);
                    logger.info(`  ├── Error: ${mobileValidationPayment.error}`);
                    logger.info(`  └── Action: Sending payment phone error`);
                    
                    await messengerService.sendText(user.messengerId, 
                        `❌ ${mobileValidationPayment.error}`
                    );
                }
                return;

            case 'awaiting_payment':
                // User is in payment flow, ignore text messages
                logger.info(`⏳ [PAYMENT IN PROGRESS]`);
                logger.info(`  ├── User: ${user.messengerId}`);
                logger.info(`  ├── Status: Awaiting payment completion`);
                logger.info(`  └── Action: Sending payment reminder`);
                
                await messengerService.sendText(user.messengerId, 'Please complete your payment to continue.', { __userDoc: user });
                return;

            case 'trial':
                // Trial stage - proceed to message processing
                break;

            case 'subscribed':
                // Check subscription limits
                if (user.dailyMessageCount >= config.limits.subscriptionMessagesPerDay) {
                    logger.info(`🛑 [DAILY LIMIT REACHED]`);
                    logger.info(`  ├── User: ${user.messengerId}`);
                    logger.info(`  ├── Limit: ${config.limits.subscriptionMessagesPerDay}`);
                    logger.info(`  └── Action: Sending limit reached message`);
                    
                    await messengerService.sendText(user.messengerId, 'You\'ve reached your daily message limit. Try again tomorrow!', { __userDoc: user });
                    return;
                }
                break;

            case 'subscription_expired':
                logger.info(`⏰ [SUBSCRIPTION EXPIRED]`);
                logger.info(`  ├── User: ${user.messengerId}`);
                logger.info(`  ├── Status: Subscription expired`);
                logger.info(`  └── Action: Sending renewal prompt`);
                
                await messengerService.sendText(user.messengerId, 'Your subscription has expired. Please renew to continue using the service.', { __userDoc: user });
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
                
                logger.info(`⏰ [REAL-TIME EXPIRY CHECK]`);
                logger.info(`  ├── User: ${user.messengerId}`);
                logger.info(`  ├── Status: Subscription expired`);
                logger.info(`  └── Action: Status updated - blocking messages`);
                
                // Block message and show expiry message
                await messengerService.sendText(user.messengerId, 
                    'Your subscription has expired. Please renew to continue using the service.'
                , { __userDoc: user });
                await sendSubscriptionOptions(user.messengerId);
                return;
            }
        }

        // Hourly AI limit disabled (was here)

        // Check message limits (daily/subscription)
        logger.info(`📊 [MESSAGE LIMITS CHECK]`);
        logger.info(`  ├── User: ${user.messengerId}`);
        logger.info(`  ├── Plan: ${user.subscription.planType}`);
        logger.info(`  ├── Trial used: ${user.trialMessagesUsedToday}`);
        logger.info(`  ├── Daily count: ${user.dailyMessageCount}`);
        logger.info(`  └── Action: Checking message eligibility`);
        
        // Atomic message count increment to prevent race conditions
        let updateResult;
        if (user.subscription.planType === 'none') {
            // Free trial logic - use atomic increment with limit check
            updateResult = await User.findOneAndUpdate(
                { 
                    messengerId: user.messengerId,
                    trialMessagesUsedToday: { $lt: config.limits.trialMessagesPerDay }
                },
                { 
                    $inc: { trialMessagesUsedToday: 1 }
                },
                { 
                    new: true,
                    runValidators: true
                }
            );

            if (!updateResult) {
                // Limit reached - user was not updated
                logger.info(`🛑 [TRIAL LIMIT REACHED]`);
                logger.info(`  ├── User: ${user.messengerId}`);
                logger.info(`  ├── Trial used: ${user.trialMessagesUsedToday}/${config.limits.trialMessagesPerDay}`);
                logger.info(`  └── Action: Sending subscription prompt`);
                
                logger.trialLimitReached(user.messengerId, user.trialMessagesUsedToday);
                await messengerService.sendText(user.messengerId, 
                    '🛑 You\'ve reached your daily free trial limit. Subscribe for premium access!'
                , { __userDoc: user });
                await sendSubscriptionOptions(user.messengerId);
                return;
            }

            logger.info(`✅ [TRIAL MESSAGE UPDATED]`);
            logger.info(`  ├── User: ${user.messengerId}`);
            logger.info(`  ├── Count: ${updateResult.trialMessagesUsedToday}/${config.limits.trialMessagesPerDay}`);
            logger.info(`  └── Action: Trial count incremented atomically`);
        } else {
            // Paid subscription logic - use atomic increment with limit check
            updateResult = await User.findOneAndUpdate(
                { 
                    messengerId: user.messengerId,
                    dailyMessageCount: { $lt: config.limits.subscriptionMessagesPerDay }
                },
                { 
                    $inc: { dailyMessageCount: 1 }
                },
                { 
                    new: true,
                    runValidators: true
                }
            );

            if (!updateResult) {
                // Limit reached - user was not updated
                logger.info(`🛑 [DAILY LIMIT REACHED]`);
                logger.info(`  ├── User: ${user.messengerId}`);
                logger.info(`  ├── Limit: ${config.limits.subscriptionMessagesPerDay}`);
                logger.info(`  └── Action: Sending limit reached message`);
                
                await messengerService.sendText(user.messengerId, 'You\'ve reached your daily message limit. Try again tomorrow!');
                return;
            }

            logger.info(`✅ [DAILY MESSAGE UPDATED]`);
            logger.info(`  ├── User: ${user.messengerId}`);
            logger.info(`  ├── Count: ${updateResult.dailyMessageCount}/${config.limits.subscriptionMessagesPerDay}`);
            logger.info(`  └── Action: Daily count incremented atomically`);
        }

        // Update the user object with the latest data for AI processing
        Object.assign(user, updateResult);
        logger.info(`🚀 [AI RESPONSE GENERATION]`);
        logger.info(`  ├── User: ${user.messengerId}`);
        logger.info(`  ├── Status: Proceeding to AI service`);
        logger.info(`  └── Action: Calling OpenAI API`);

        try {
            // AI calls are not rate-limited (Graph only)
            // Generate AI response with consistent formatting instructions
            let aiResponse;
            try {
                aiResponse = await aiService.generateUserResponse(messageText);
                incAI(user.messengerId, { success: true });
            } catch (e) {
                incAI(user.messengerId, { success: false });
                throw e;
            }

            // Send response to user
            try {
                await messengerService.sendText(user.messengerId, aiResponse, { __userDoc: user });
            } catch (err) {
                if (err && err.code === 'GRAPH_RATE_LIMIT') {
                    logger.warn('Graph send suppressed due to per-hour limit', { user: user.messengerId, details: err.details });
                    return;
                }
                throw err;
            }
            
            logger.info(`✅ [AI RESPONSE SENT]`);
            logger.info(`  ├── User: ${user.messengerId}`);
            logger.info(`  ├── Status: Successfully sent`);
            logger.info(`  └── Action: Response sent to user`);
        } catch (error) {
            logger.error(`❌ [AI RESPONSE ERROR]`);
            logger.error(`  ├── User: ${user.messengerId}`);
            logger.error(`  ├── Error: ${error.message}`);
            logger.error(`  └── Action: Sending fallback message`);
            
            await messengerService.sendText(user.messengerId, 
                "I apologize, but I'm having trouble processing your request right now. Please try again in a moment.");
        }

    } catch (error) {
        logger.error('################################');
        logger.error('### MESSAGE PROCESSING ERROR ###');
        logger.error('################################');
        logger.error(`❌ [ERROR]`);
        logger.error(`  ├── Type: Message processing error`);
        logger.error(`  ├── User: ${user?.messengerId || 'Unknown'}`);
        logger.error(`  └── Details: ${error.message}`);
    }
}

// Send subscription options
async function sendSubscriptionOptions(userId) {
    const config = require('../config');
    
    logger.info(`💳 [SUBSCRIPTION OPTIONS]`);
    logger.info(`  ├── User: ${userId}`);
    logger.info(`  ├── Status: Sending plan options`);
    logger.info(`  └── Action: Sending subscription buttons`);
    
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
        logger.info(`🔘 [POSTBACK PROCESSING]`);
        logger.info(`  ├── User: ${user.messengerId}`);
        logger.info(`  ├── Payload: ${payload}`);
        logger.info(`  └── Action: Executing button action`);
        
        switch (payload) {
            case 'GET_STARTED':
                logger.info(`🚀 [GET STARTED CLICKED]`);
                logger.info(`  ├── User: ${user.messengerId}`);
                logger.info(`  ├── Action: Starting onboarding`);
                logger.info(`  └── Result: Welcome message sent`);
                
                await sendWelcomeMessage(user.messengerId);
                break;

            case 'I_AGREE':
                logger.info(`✅ [TERMS ACCEPTED]`);
                logger.info(`  ├── User: ${user.messengerId}`);
                logger.info(`  ├── Action: Accepting terms`);
                logger.info(`  └── Result: Phone collection started`);
                
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
                logger.info(`💳 [WEEKLY PLAN SELECTED]`);
                logger.info(`  ├── User: ${user.messengerId}`);
                logger.info(`  ├── Action: Selecting weekly plan`);
                logger.info(`  └── Result: Payment phone requested`);
                
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
                
            case 'SUBSCRIBE_MONTHLY':
                logger.info(`💳 [MONTHLY PLAN SELECTED]`);
                logger.info(`  ├── User: ${user.messengerId}`);
                logger.info(`  ├── Action: Selecting monthly plan`);
                logger.info(`  └── Result: Payment phone requested`);
                
                const planType2 = payload === 'SUBSCRIBE_WEEKLY' ? 'weekly' : 'monthly';
                // Save last selected plan type for use after phone collection
                user.lastSelectedPlanType = planType2;
                // Clear any existing payment mobile number and ask for a new one
                user.paymentMobileNumber = null;
                user.stage = 'awaiting_phone_for_payment';
                await user.save();
                await messengerService.sendText(user.messengerId,
                    'To continue, please enter your MTN mobile number (e.g., 092xxxxxxx) for payment processing.'
                );
                break;

            case 'RETRY_NUMBER':
                logger.info(`🔄 [RETRY NUMBER REQUESTED]`);
                logger.info(`  ├── User: ${user.messengerId}`);
                logger.info(`  ├── Action: Retrying with different number`);
                logger.info(`  └── Result: New number requested`);
                
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
        logger.error('################################');
        logger.error('### POSTBACK PROCESSING ERROR ###');
        logger.error('################################');
        logger.error(`❌ [ERROR]`);
        logger.error(`  ├── Type: Postback processing error`);
        logger.error(`  ├── User: ${user.messengerId}`);
        logger.error(`  ├── Payload: ${payload}`);
        logger.error(`  └── Details: ${error.message}`);
    }
}

// Send welcome message
async function sendWelcomeMessage(userId, ctx) {
    logger.info(`👋 [WELCOME MESSAGE]`);
    logger.info(`  ├── User: ${userId}`);
    logger.info(`  ├── Action: Sending welcome message`);
    logger.info(`  └── Result: Onboarding flow initiated`);
    
    await messengerService.sendWelcomeMessage(userId, ctx);
}

module.exports = webhookController;
