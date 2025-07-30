require('dotenv').config();
const mongoose = require('mongoose');
const logger = require('./utils/logger');
const readline = require('readline');

// Import models
const User = require('./models/user');
const Subscription = require('./models/subscription');

// Import configuration
const config = require('./config');

// Create readline interface for user input
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Promise wrapper for readline
function question(prompt) {
    return new Promise((resolve) => {
        rl.question(prompt, resolve);
    });
}

async function clearDatabaseSafe() {
    try {
        // Connect to database
        logger.info('🔌 Connecting to database...');
        await mongoose.connect(config.database.uri, config.database.options);
        logger.info('✅ Database connected successfully');

        // Get counts before deletion
        const userCount = await User.countDocuments();
        const subscriptionCount = await Subscription.countDocuments();

        logger.info(`📊 Current database state:`);
        logger.info(`   Users: ${userCount}`);
        logger.info(`   Subscriptions: ${subscriptionCount}`);

        if (userCount === 0 && subscriptionCount === 0) {
            logger.info('✅ Database is already empty');
            return;
        }

        // Show warning and ask for confirmation
        logger.warn('⚠️  WARNING: This will delete ALL user data!');
        logger.warn('⚠️  This action cannot be undone!');
        logger.warn('⚠️  Make sure you have backups if needed!');
        
        const answer = await question('\n❓ Are you sure you want to proceed? Type "YES" to confirm: ');
        
        if (answer.trim() !== 'YES') {
            logger.info('❌ Operation cancelled by user');
            return;
        }

        // Double confirmation
        const finalAnswer = await question('\n❓ Final confirmation: Type "DELETE ALL" to proceed: ');
        
        if (finalAnswer.trim() !== 'DELETE ALL') {
            logger.info('❌ Operation cancelled by user');
            return;
        }
        
        logger.info('🗑️  Starting database cleanup...');

        // Delete in order to respect foreign key constraints
        // 1. Delete subscriptions (they reference users)
        logger.info('🗑️  Deleting subscriptions...');
        const subscriptionResult = await Subscription.deleteMany({});
        logger.info(`   ✅ Deleted ${subscriptionResult.deletedCount} subscriptions`);

        // 2. Delete users (main collection)
        logger.info('🗑️  Deleting users...');
        const userResult = await User.deleteMany({});
        logger.info(`   ✅ Deleted ${userResult.deletedCount} users`);

        // Verify deletion
        const finalUserCount = await User.countDocuments();
        const finalSubscriptionCount = await Subscription.countDocuments();

        logger.info('📊 Final database state:');
        logger.info(`   Users: ${finalUserCount}`);
        logger.info(`   Subscriptions: ${finalSubscriptionCount}`);

        if (finalUserCount === 0 && finalSubscriptionCount === 0) {
            logger.info('✅ Database cleared successfully!');
            logger.info('🎉 You can now test the bot with a fresh start');
        } else {
            logger.error('❌ Some data may not have been cleared properly');
        }

    } catch (error) {
        logger.error('❌ Error clearing database:', error);
        throw error;
    } finally {
        // Close readline interface
        rl.close();
        // Close database connection
        await mongoose.connection.close();
        logger.info('🔌 Database connection closed');
    }
}

// Run the script
if (require.main === module) {
    clearDatabaseSafe()
        .then(() => {
            logger.info('✅ Database clearing completed');
            process.exit(0);
        })
        .catch((error) => {
            logger.error('❌ Database clearing failed:', error);
            process.exit(1);
        });
}

module.exports = clearDatabaseSafe; 