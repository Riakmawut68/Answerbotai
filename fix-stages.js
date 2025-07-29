#!/usr/bin/env node

/**
 * Quick script to fix invalid user stages in the database
 * Run this after deploying the code changes to fix existing data
 */

require('dotenv').config();
const { fixInvalidUserStages } = require('./migrations/fix-user-stages');

console.log('🚀 Starting stage validation fix...');
console.log('This will fix any users with invalid stages in your database.\n');

fixInvalidUserStages()
    .then(fixedCount => {
        console.log('\n✅ STAGE VALIDATION FIX COMPLETED!');
        console.log(`   Fixed ${fixedCount} users with invalid stages`);
        console.log('\n🎯 Next steps:');
        console.log('   1. Deploy your updated code');
        console.log('   2. Monitor logs for any validation errors');
        console.log('   3. Test user registration and payment flows');
        console.log('\n🏁 Your messenger bot should now be more reliable!');
    })
    .catch(error => {
        console.error('\n❌ STAGE VALIDATION FIX FAILED!');
        console.error('Error:', error.message);
        console.log('\n🔧 Troubleshooting:');
        console.log('   1. Check your MONGODB_URI environment variable');
        console.log('   2. Ensure database is accessible');
        console.log('   3. Check database permissions');
        process.exit(1);
    });