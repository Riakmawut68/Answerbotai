const mongoose = require('mongoose');
const User = require('../models/user');
const logger = require('../utils/logger');

async function fixInvalidUserStages() {
    console.log('🔧 Starting user stage validation fix...');
    
    try {
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        
        console.log('✅ Connected to database');
        
        // Find users with potentially invalid stages
        const users = await User.find({});
        let fixedCount = 0;
        
        console.log(`📊 Found ${users.length} users to check`);
        
        for (const user of users) {
            const originalStage = user.stage;
            let newStage = originalStage;
            let shouldSave = false;
            
            // Fix common stage inconsistencies
            const stageMappings = {
                'subscribed': 'subscription_active',
                'phone_verified': 'trial',
                'active': 'subscription_active'
            };
            
            if (stageMappings[originalStage]) {
                newStage = stageMappings[originalStage];
                shouldSave = true;
                console.log(`🔄 Fixing user ${user.messengerId}: ${originalStage} → ${newStage}`);
            }
            
            // Default invalid stages to appropriate stage based on user state
            const validStages = [
                'initial', 'awaiting_phone', 'awaiting_phone_for_payment', 
                'trial', 'awaiting_payment', 'subscription_active', 
                'subscribed', 'payment_failed', 'subscription_expired'
            ];
            
            if (!validStages.includes(originalStage)) {
                // Determine appropriate stage based on user state
                if (user.consentTimestamp && user.mobileNumber && user.hasUsedTrial) {
                    if (user.subscription && user.subscription.status === 'active') {
                        newStage = 'subscription_active';
                    } else {
                        newStage = 'trial';
                    }
                } else if (user.consentTimestamp && !user.mobileNumber) {
                    newStage = 'awaiting_phone';
                } else {
                    newStage = 'initial';
                }
                shouldSave = true;
                console.log(`🆘 Defaulting user ${user.messengerId}: ${originalStage} → ${newStage}`);
            }
            
            // Fix subscription status vs stage mismatches
            if (user.subscription && user.subscription.status === 'active' && user.stage === 'trial') {
                newStage = 'subscription_active';
                shouldSave = true;
                console.log(`🔄 Fixing subscription/stage mismatch for user ${user.messengerId}: trial → subscription_active`);
            }
            
            if (shouldSave) {
                user.stage = newStage;
                await user.save();
                fixedCount++;
            }
        }
        
        console.log(`✅ Migration completed successfully`);
        console.log(`📊 Users checked: ${users.length}`);
        console.log(`🔧 Users fixed: ${fixedCount}`);
        
        return fixedCount;
        
    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    } finally {
        await mongoose.connection.close();
        console.log('📪 Database connection closed');
    }
}

// Run if called directly
if (require.main === module) {
    fixInvalidUserStages()
        .then(fixedCount => {
            console.log(`\n🎉 Migration completed! Fixed ${fixedCount} users.`);
            process.exit(0);
        })
        .catch(error => {
            console.error('\n💥 Migration failed:', error);
            process.exit(1);
        });
}

module.exports = { fixInvalidUserStages };