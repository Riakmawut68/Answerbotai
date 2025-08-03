const express = require('express');
const router = express.Router();
const messengerController = require('../controllers/messengerController');

// Facebook Messenger webhook routes
router.get('/', messengerController.verify);
router.post('/', messengerController.handleEvent);

module.exports = router;
