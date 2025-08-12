const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhookController');

// Facebook Messenger webhook routes
router.get('/', webhookController.verify);
router.post('/', webhookController.handleEvent);

module.exports = router;
