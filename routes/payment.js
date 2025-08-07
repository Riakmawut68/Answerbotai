const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const User = require('../models/user');
const momoService = require('../services/momoService');
const paymentTimeoutScheduler = require('../schedulers/paymentTimeout');

// Get payment status for a user
router.get('/status/:messengerId', async (req, res) => {
    try {
        const { messengerId } = req.params;
        
        const user = await User.findOne({ messengerId });
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const paymentInfo = {
            stage: user.stage,
            subscription: user.subscription,
            paymentSession: user.paymentSession,
            hasActiveSubscription: user.subscription?.status === 'active',
            canSendMessages: user.stage === 'trial' || user.stage === 'subscribed'
        };

        // If user has a payment session, check if it's expired
        if (user.paymentSession && user.paymentSession.startTime) {
            const now = new Date();
            const startTime = new Date(user.paymentSession.startTime);
            const minutesElapsed = Math.floor((now - startTime) / (1000 * 60));
            const isExpired = minutesElapsed >= 15;

            paymentInfo.paymentSessionInfo = {
                minutesElapsed,
                isExpired,
                timeRemaining: isExpired ? 0 : 15 - minutesElapsed
            };
        }

        res.json(paymentInfo);
    } catch (error) {
        logger.error('Error getting payment status:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Manual cleanup of expired payments (admin endpoint)
router.post('/cleanup', async (req, res) => {
    try {
        logger.info('Manual payment cleanup requested');
        
        await paymentTimeoutScheduler.cleanupExpiredPayments();
        
        res.json({ 
            success: true, 
            message: 'Payment cleanup completed' 
        });
    } catch (error) {
        logger.error('Error during manual payment cleanup:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get all users with pending payments
router.get('/pending', async (req, res) => {
    try {
        const pendingUsers = await User.find({ 
            stage: 'awaiting_payment' 
        }).select('messengerId paymentSession stage');

        const now = new Date();
        const pendingWithTimeInfo = pendingUsers.map(user => {
            const startTime = new Date(user.paymentSession?.startTime);
            const minutesElapsed = Math.floor((now - startTime) / (1000 * 60));
            const isExpired = minutesElapsed >= 15;

            return {
                messengerId: user.messengerId,
                stage: user.stage,
                paymentSession: user.paymentSession,
                timeInfo: {
                    minutesElapsed,
                    isExpired,
                    timeRemaining: isExpired ? 0 : 15 - minutesElapsed
                }
            };
        });

        res.json({
            total: pendingWithTimeInfo.length,
            expired: pendingWithTimeInfo.filter(u => u.timeInfo.isExpired).length,
            active: pendingWithTimeInfo.filter(u => !u.timeInfo.isExpired).length,
            users: pendingWithTimeInfo
        });
    } catch (error) {
        logger.error('Error getting pending payments:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
