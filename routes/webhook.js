const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhookController');
const verifyWebhook = require('../middlewares/verifyWebhook');
const momoService = require('../services/momoService');
const messengerService = require('../services/messengerService');
const logger = require('../utils/logger');

// Webhook verification endpoint
router.get('/', verifyWebhook, webhookController.verify);

// Webhook event handling endpoint
router.post('/', verifyWebhook, webhookController.handleEvent);

// Payment callback endpoint for MTN MoMo
router.post('/payment-callback', async (req, res) => {
    try {
        const { reference, status } = req.body;
        logger.info(`📞 Payment callback received: Reference=${reference}, Status=${status}`);
        
        if (!reference || !status) {
            return res.status(400).json({ error: 'Missing reference or status' });
        }

        const user = await momoService.handlePaymentCallback(reference, status);
        
        if (status === 'SUCCESSFUL') {
            await messengerService.sendText(user.messengerId,
                '✅ Payment successful!\n\n' +
                '🎉 You now have access to Answer Bot AI with 30 messages per day. Enjoy smart, instant responses!'
            );
        } else {
            await messengerService.sendText(user.messengerId,
                '❌ Payment failed or session expired.\n\n' +
                'Please try subscribing again to continue using Answer Bot AI.'
            );
        }

        res.status(200).json({ message: 'Callback processed successfully' });
    } catch (error) {
        logger.error('❌ Payment callback processing failed:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
