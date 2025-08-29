const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhookController');
const verifyWebhook = require('../middlewares/verifyWebhook');

// Facebook Messenger webhook routes
router.get('/', webhookController.verify);
router.post('/', verifyWebhook, webhookController.handleEvent);

module.exports = router;
