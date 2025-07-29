const cron = require('cron');
const logger = require('../utils/logger');
const timezone = require('../utils/timezone');
const User = require('../models/user');

class DailyResetScheduler {
    constructor() {
        this.job = null;
        this.isRunning = false;
    }

    // Start the daily reset scheduler
    start() {
        // Run at midnight Juba time (9 PM UTC)
        const cronExpression = timezone.getMidnightCronExpression();
        
        this.job = new cron.CronJob(
            cronExpression,
            () => this.performDailyReset(),
            null,
            false,
            'UTC'
        );

        this.job.start();
        logger.info(`🕛 Daily reset scheduler started. Will run at midnight Juba time (${cronExpression})`);
    }

    // Stop the scheduler
    stop() {
        if (this.job) {
            this.job.stop();
            logger.info('🛑 Daily reset scheduler stopped');
        }
    }

    // Perform the daily reset operation
    async performDailyReset() {
        if (this.isRunning) {
            logger.warn('⚠️ Daily reset already running, skipping...');
            return;
        }

        this.isRunning = true;
        const startTime = Date.now();

        try {
            logger.info('🔄 Starting daily reset operation...');

            // Get current time in Juba timezone
            const jubaTime = timezone.getCurrentTime();
            logger.info(`🌍 Current Juba time: ${jubaTime.format('YYYY-MM-DD HH:mm:ss')}`);

            // Reset trial messages for all users
            const trialResetResult = await User.updateMany(
                { 'subscription.plan': 'none' },
                { 
                    $set: { 
                        trialMessagesUsedToday: 0,
                        lastTrialResetDate: new Date()
                    }
                }
            );

            // Reset daily message count for subscribed users
            const subscriptionResetResult = await User.updateMany(
                { 
                    'subscription.plan': { $in: ['weekly', 'monthly'] },
                    'subscription.status': 'active'
                },
                { 
                    $set: { 
                        dailyMessageCount: 0,
                        lastMessageCountResetDate: new Date()
                    }
                }
            );

            const duration = Date.now() - startTime;

            logger.info('✅ Daily reset completed successfully:', {
                trialUsersReset: trialResetResult.modifiedCount,
                subscriptionUsersReset: subscriptionResetResult.modifiedCount,
                duration: `${duration}ms`,
                timestamp: jubaTime.format('YYYY-MM-DD HH:mm:ss')
            });

        } catch (error) {
            logger.error('❌ Daily reset failed:', {
                error: error.message,
                stack: error.stack,
                duration: `${Date.now() - startTime}ms`
            });
        } finally {
            this.isRunning = false;
        }
    }

    // Manual reset for testing
    async manualReset() {
        logger.info('🔧 Manual daily reset triggered');
        await this.performDailyReset();
    }

    // Get scheduler status
    getStatus() {
        return {
            isRunning: this.isRunning,
            isActive: this.job ? this.job.running : false,
            nextRun: this.job ? this.job.nextDate().toISOString() : null,
            cronExpression: timezone.getMidnightCronExpression()
        };
    }
}

module.exports = new DailyResetScheduler(); 