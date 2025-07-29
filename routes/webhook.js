const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhookController');
const verifyWebhook = require('../middlewares/verifyWebhook');

// Webhook verification endpoint
router.get('/', verifyWebhook, webhookController.verify);

// Webhook event handling endpoint
router.post('/', verifyWebhook, webhookController.handleEvent);

// Payment callback endpoint (for MTN MoMo callbacks)
router.post('/payment-callback', webhookController.handlePaymentCallback);

module.exports = router;
