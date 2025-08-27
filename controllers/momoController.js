const logger = require('../utils/logger');
const User = require('../models/user');
const messengerService = require('../services/messengerService');
const MomoService = require('../services/momoService');
const momoService = new MomoService();

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
                const userByExternal = await User.findOne({ 'paymentSession.externalId': normalized.externalId });
                if (userByExternal?.paymentSession?.reference) {
                    normalized.referenceId = userByExternal.paymentSession.reference;
                }
            }

            const result = await momoService.handlePaymentCallback(normalized, req);
            
            if (result.success) {
                // Find user by payment reference to send notification
                const user = await User.findOne({ 
                    'paymentSession.reference': normalized.referenceId 
                });

                if (user && normalized.status === 'SUCCESSFUL') {
                    // Send success message
                    await messengerService.sendText(user.messengerId,
                        '🎉 Payment successful! Your subscription is now active.\n\n' +
                        'You can now send up to 30 messages per day. Enjoy using Answer Bot AI!'
                    );

                    logger.subscriptionActivated(user.messengerId, 'weekly');
                } else if (user && normalized.status === 'FAILED') {
                    // Send failure message
                    const failureReason = normalized.reason ? ` Reason: ${normalized.reason}` : '';
                    await messengerService.sendText(
                        user.messengerId,
                        `❌ Payment failed.${failureReason}\nYou can continue using your trial messages or try subscribing again later.`
                    );
                    
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