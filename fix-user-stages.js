require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/user');
const logger = require('./utils/logger');

async function fixUserStages() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        logger.info('Connected to MongoDB');

        // Find all users with 'phone_verified' stage
        const usersToFix = await User.find({ stage: 'phone_verified' });
        logger.info(`Found ${usersToFix.length} users with 'phone_verified' stage`);

        if (usersToFix.length === 0) {
            logger.info('No users need fixing');
            return;
        }

        // Update each user to 'trial' stage
        for (const user of usersToFix) {
            user.stage = 'trial';
            await user.save();
            logger.info(`Fixed user ${user.messengerId}: phone_verified → trial`);
        }

        logger.info(`Successfully fixed ${usersToFix.length} users`);

    } catch (error) {
        logger.error('Error fixing user stages:', error);
    } finally {
        await mongoose.disconnect();
        logger.info('Disconnected from MongoDB');
    }
}

// Run the migration
fixUserStages(); 