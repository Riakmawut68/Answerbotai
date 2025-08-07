const cron = require('cron');
const logger = require('../utils/logger');
const timezone = require('../utils/timezone');
const User = require('../models/user');
const messengerService = require('../services/messengerService');

class PaymentTimeoutScheduler {
    constructor() {
        this.job = null;
        this.isRunning = false;
        this.PAYMENT_TIMEOUT_MINUTES = 15; // 15 minutes timeout
    }

    // Start the payment timeout scheduler
    start() {
        // Run every 5 minutes to check for expired payments
        const cronExpression = '*/5 * * * *';
        
        this.job = new cron.CronJob(
            cronExpression,
            () => this.checkExpiredPayments(),
            null,
            false,
            'UTC'
        );

        this.job.start();
        logger.info(`⏰ Payment timeout scheduler started. Will run every 5 minutes (${cronExpression})`);
    }

    // Stop the scheduler
    stop() {
        if (this.job) {
            this.job.stop();
            logger.info('⏰ Payment timeout scheduler stopped');
        }
    }

    // Check for expired payment sessions
    async checkExpiredPayments() {
        if (this.isRunning) {
            logger.warn('⚠️ Payment timeout check already running, skipping...');
            return;
        }

        this.isRunning = true;
        const startTime = Date.now();

        try {
            logger.info('🔍 Starting payment timeout check...');

            const now = new Date();
            const timeoutThreshold = new Date(now.getTime() - (this.PAYMENT_TIMEOUT_MINUTES * 60 * 1000));

            // Find users with expired payment sessions
            const expiredPayments = await User.find({
                stage: 'awaiting_payment',
                'paymentSession.startTime': { $lt: timeoutThreshold }
            });

            if (expiredPayments.length === 0) {
                logger.info('✅ No expired payment sessions found');
                return;
            }

            logger.info(`📊 Found ${expiredPayments.length} users with expired payment sessions`);

            // Process each expired payment
            for (const user of expiredPayments) {
                await this.handleExpiredPayment(user);
            }

            const duration = Date.now() - startTime;

            logger.info('✅ Payment timeout check completed:', {
                expiredPaymentsFound: expiredPayments.length,
                duration: `${duration}ms`,
                timestamp: timezone.getCurrentTime().format('YYYY-MM-DD HH:mm:ss')
            });

        } catch (error) {
            logger.error('❌ Payment timeout check failed:', {
                error: error.message,
                stack: error.stack,
                duration: `${Date.now() - startTime}ms`
            });
        } finally {
            this.isRunning = false;
        }
    }

    // Handle individual expired payment
    async handleExpiredPayment(user) {
        try {
            const reference = user.paymentSession?.reference;
            const planType = user.paymentSession?.planType;

            // Clear payment session and reset to trial
            user.paymentSession = null;
            user.stage = 'trial';

            await user.save();

            // Send timeout notification to user
            await messengerService.sendText(user.messengerId,
                '⏰ Your payment session has expired. You can continue using your trial messages or try subscribing again.\n\n' +
                'Type "subscribe" to start a new payment process.'
            );

            logger.info('Payment session expired and cleaned up:', {
                user: user.messengerId,
                reference,
                planType,
                timeoutMinutes: this.PAYMENT_TIMEOUT_MINUTES
            });

        } catch (error) {
            logger.error('Failed to handle expired payment:', {
                user: user.messengerId,
                error: error.message
            });
        }
    }

    // Manual cleanup method for testing
    async cleanupExpiredPayments() {
        logger.info('🧹 Manual payment cleanup requested');
        await this.checkExpiredPayments();
    }
}

module.exports = new PaymentTimeoutScheduler();
