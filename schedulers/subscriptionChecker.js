const cron = require('cron');
const logger = require('../utils/logger');
const timezone = require('../utils/timezone');
const User = require('../models/user');

class SubscriptionCheckerScheduler {
    constructor() {
        this.job = null;
        this.isRunning = false;
    }

    // Start the subscription checker scheduler
    start() {
        // Run every 30 minutes
        const cronExpression = timezone.getThirtyMinuteCronExpression();
        
        this.job = new cron.CronJob(
            cronExpression,
            () => this.checkExpiredSubscriptions(),
            null,
            false,
            'UTC'
        );

        this.job.start();
        logger.info(`⏰ Subscription checker scheduler started. Will run every 30 minutes (${cronExpression})`);
    }

    // Stop the scheduler
    stop() {
        if (this.job) {
            this.job.stop();
            logger.info('🛑 Subscription checker scheduler stopped');
        }
    }

    // Check for expired subscriptions
    async checkExpiredSubscriptions() {
        if (this.isRunning) {
            logger.warn('⚠️ Subscription check already running, skipping...');
            return;
        }

        this.isRunning = true;
        const startTime = Date.now();

        try {
            logger.info('🔍 Starting subscription expiry check...');

            const now = new Date();

            // Find users with expired subscriptions
            const expiredUsers = await User.find({
                'subscription.status': 'active',
                'subscription.expiryDate': { $lt: now }
            });

            if (expiredUsers.length === 0) {
                logger.info('✅ No expired subscriptions found');
                return;
            }

            logger.info(`📊 Found ${expiredUsers.length} users with expired subscriptions`);

            // Update expired subscriptions
            const updateResult = await User.updateMany(
                {
                    'subscription.status': 'active',
                    'subscription.expiryDate': { $lt: now }
                },
                {
                    $set: {
                        'subscription.status': 'expired',
                        stage: 'subscription_expired'
                    }
                }
            );

            const duration = Date.now() - startTime;

            logger.info('✅ Subscription expiry check completed:', {
                expiredUsersFound: expiredUsers.length,
                subscriptionsUpdated: updateResult.modifiedCount,
                duration: `${duration}ms`,
                timestamp: timezone.getCurrentTime().format('YYYY-MM-DD HH:mm:ss')
            });

            // Log details of expired users (for monitoring)
            expiredUsers.forEach(user => {
                logger.info('📋 User subscription expired:', {
                    messengerId: user.messengerId,
                    plan: user.subscription.plan,
                    expiryDate: user.subscription.expiryDate,
                    mobileNumber: user.mobileNumber
                });
            });

        } catch (error) {
            logger.error('❌ Subscription expiry check failed:', {
                error: error.message,
                stack: error.stack,
                duration: `${Date.now() - startTime}ms`
            });
        } finally {
            this.isRunning = false;
        }
    }

    // Manual check for testing
    async manualCheck() {
        logger.info('🔧 Manual subscription check triggered');
        await this.checkExpiredSubscriptions();
    }

    // Get scheduler status
    getStatus() {
        return {
            isRunning: this.isRunning,
            isActive: this.job ? this.job.running : false,
            nextRun: this.job ? this.job.nextDate().toISOString() : null,
            cronExpression: timezone.getThirtyMinuteCronExpression()
        };
    }

    // Get subscription statistics
    async getSubscriptionStats() {
        try {
            const stats = await User.aggregate([
                {
                    $group: {
                        _id: '$subscription.status',
                        count: { $sum: 1 }
                    }
                }
            ]);

            const planStats = await User.aggregate([
                {
                    $group: {
                        _id: '$subscription.plan',
                        count: { $sum: 1 }
                    }
                }
            ]);

            return {
                statusStats: stats,
                planStats: planStats,
                timestamp: timezone.getCurrentTime().format('YYYY-MM-DD HH:mm:ss')
            };
        } catch (error) {
            logger.error('❌ Failed to get subscription stats:', error);
            return null;
        }
    }
}

module.exports = new SubscriptionCheckerScheduler(); 