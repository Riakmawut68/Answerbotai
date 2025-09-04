const logger = require('../utils/logger');
const User = require('../models/user');
const messengerService = require('../services/messengerService');
const MomoService = require('../services/momoService');
const momoService = new MomoService();
const PaymentRequest = require('../models/paymentRequest');

const momoController = {
    // Handle payment callbacks from MTN MoMo
    handlePaymentCallback: async (req, res) => {
        try {
            const { body, headers } = req;
            logger.info('💰 Payment callback received:', body);

            // Normalize callback data: MTN may omit referenceId in body; use header X-Reference-Id
            const referenceId = body.referenceId || headers['x-reference-id'] || headers['X-Reference-Id'];
            const status = body.status;
            const reason = body.reason;
            const externalId = body.externalId;

            const normalized = { referenceId, status, reason, externalId };

            // Acknowledge receipt to MTN immediately
            res.status(200).json({ status: 'OK' });

            // Process the callback asynchronously
            // If referenceId missing but we have externalId, try to resolve to the stored reference
            if (!normalized.referenceId && normalized.externalId) {
                // Try durable mapping first
                const pr = await PaymentRequest.findOne({ externalId: normalized.externalId });
                if (pr?.referenceId) {
                    normalized.referenceId = pr.referenceId;
                } else {
                    // Fallback to active paymentSession
                    const userByExternal = await User.findOne({ 'paymentSession.externalId': normalized.externalId });
                    if (userByExternal?.paymentSession?.reference) {
                        normalized.referenceId = userByExternal.paymentSession.reference;
                    }
                }
            }

            const result = await momoService.handlePaymentCallback(normalized, req);

            // Always attempt to notify the user based on callback status
            // Find user by payment reference to send notification
            let user = await User.findOne({ 
                'paymentSession.reference': normalized.referenceId 
            });
            let messengerIdForNotify = null;
            let prForNotify = null;
            if (!user) {
                prForNotify = await PaymentRequest.findOne({ referenceId: normalized.referenceId });
                if (prForNotify?.messengerId) {
                    messengerIdForNotify = prForNotify.messengerId;
                    user = await User.findOne({ messengerId: messengerIdForNotify });
                }
            }

                if ((user || messengerIdForNotify) && normalized.status === 'SUCCESSFUL') {
                    const notifyMessengerId = user ? user.messengerId : messengerIdForNotify;
                    logger.info('✅ Payment successful - notifying user', {
                        referenceId: normalized.referenceId,
                        status: normalized.status,
                        messengerId: notifyMessengerId
                    });
                    // Build rich success message when we have the user and subscription details
                    let successText;
                    if (user && user.subscription && user.subscription.status === 'active') {
                        const timezone = require('../utils/timezone');
                        const expiryMoment = timezone.toJubaTime(user.subscription.expiryDate);
                        const planLabel = user.subscription.planType === 'weekly' ? 'Weekly Plan' : 'Monthly Plan';
                        // Some code paths store display amounts separately; fall back to config display if needed
                        const config = require('../config');
                        const displayAmount = user.subscription.amount || (user.subscription.planType === 'weekly' ? config.momo.displayAmounts.weekly : config.momo.displayAmounts.monthly);
                        const displayCurrency = config.momo.displayCurrency;

                        successText =
                            '🎉 Payment successful! Your subscription is now active.\n\n' +
                            '💳 **Plan Details:**\n' +
                            `• Plan: ${planLabel}\n` +
                            `• Cost: ${displayAmount.toLocaleString()} ${displayCurrency}\n` +
                            '• Messages: 30 per day\n' +
                            `• Expires: ${expiryMoment.format('YYYY-MM-DD HH:mm:ss')}\n\n` +
                            '🚀 **What\'s Next:**\n' +
                            '• Start asking questions immediately\n' +
                            '• Daily limit resets at midnight (Juba time)\n' +
                            '• Use \'status\' command to check your usage\n\n' +
                            'Enjoy using Answer Bot AI! 🤖';
                    } else {
                        // Fallback minimal message if we cannot compute rich details
                        successText = '🎉 Payment successful! Your subscription is now active. You can now send up to 30 messages per day. Enjoy using Answer Bot AI!';
                    }

                    await messengerService.sendText(notifyMessengerId, successText);

                    if (user) {
                        logger.subscriptionActivated(user.messengerId, user.subscription?.planType || 'unknown');
                    }
                } else if ((user || messengerIdForNotify) && normalized.status === 'FAILED') {
                    const notifyMessengerId = user ? user.messengerId : messengerIdForNotify;
                    const failureReason = normalized.reason ? ` Reason: ${normalized.reason}` : '';
                    logger.info('❌ Payment failed - notifying user', {
                        referenceId: normalized.referenceId,
                        status: normalized.status,
                        reason: normalized.reason || null,
                        messengerId: notifyMessengerId
                    });
                    await messengerService.sendText(
                        notifyMessengerId,
                        `❌ Payment failed.${failureReason}\nYou can continue using your trial messages or try subscribing again later.`
                    );
                    if (user) {
                        logger.paymentFailed(user.messengerId, 'Payment failed');
                    }
                }
            

        } catch (error) {
            logger.error('❌ Error handling payment callback:', error);
            // Don't send error response since we already sent 200 OK
        }
    },

    // Health check endpoint for MoMo service
    healthCheck: async (req, res) => {
        try {
            const serviceInfo = momoService.getServiceInfo();
            res.status(200).json({
                status: 'healthy',
                momo: serviceInfo,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            logger.error('MoMo health check failed:', error);
            res.status(500).json({
                status: 'unhealthy',
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    },

    // Diagnostic endpoint for troubleshooting
    diagnose: async (req, res) => {
        try {
            const diagnosis = await momoService.diagnose();
            res.status(200).json(diagnosis);
        } catch (error) {
            logger.error('MoMo diagnosis failed:', error);
            res.status(500).json({
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }
};

module.exports = momoController; 