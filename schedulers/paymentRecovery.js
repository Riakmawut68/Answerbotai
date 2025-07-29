const cron = require('cron');
const logger = require('../utils/logger');
const paymentTimeoutService = require('../services/paymentTimeoutService');

class PaymentRecoveryScheduler {
    constructor() {
        this.job = null;
        this.isRunning = false;
    }

    // Start the payment recovery scheduler
    start() {
        // Run every 5 minutes to check for stuck payments
        const cronExpression = '*/5 * * * *';
        
        this.job = new cron.CronJob(
            cronExpression,
            () => this.recoverStuckPayments(),
            null,
            false,
            'UTC'
        );

        this.job.start();
        logger.info(`💳 Payment recovery scheduler started. Will run every 5 minutes (${cronExpression})`);
    }

    // Stop the scheduler
    stop() {
        if (this.job) {
            this.job.stop();
            logger.info('🛑 Payment recovery scheduler stopped');
        }
    }

    // Recover stuck payments
    async recoverStuckPayments() {
        if (this.isRunning) {
            logger.warn('⚠️ Payment recovery already running, skipping...');
            return;
        }

        this.isRunning = true;
        const startTime = Date.now();

        try {
            logger.info('🔄 Starting payment recovery check...');

            const recoveredCount = await paymentTimeoutService.checkStuckPayments();
            const duration = Date.now() - startTime;

            logger.info('✅ Payment recovery completed:', {
                recoveredPayments: recoveredCount,
                duration: `${duration}ms`,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            logger.error('❌ Payment recovery failed:', {
                error: error.message,
                stack: error.stack,
                duration: `${Date.now() - startTime}ms`
            });
        } finally {
            this.isRunning = false;
        }
    }

    // Manual recovery for testing
    async manualRecovery() {
        logger.info('🔧 Manual payment recovery triggered');
        await this.recoverStuckPayments();
    }

    // Get scheduler status
    getStatus() {
        return {
            isRunning: this.isRunning,
            isActive: this.job ? this.job.running : false,
            nextRun: this.job ? this.job.nextDate().toISOString() : null,
            cronExpression: '*/5 * * * *'
        };
    }
}

module.exports = new PaymentRecoveryScheduler();