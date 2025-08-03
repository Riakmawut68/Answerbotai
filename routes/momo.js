const express = require('express');
const router = express.Router();
const momoController = require('../controllers/momoController');

// MoMo payment callback endpoint
router.post('/callback', momoController.handlePaymentCallback);

// MoMo service health check
router.get('/health', momoController.healthCheck);

// MoMo service diagnostics
router.get('/diagnose', momoController.diagnose);

module.exports = router; 