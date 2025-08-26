#!/usr/bin/env node

const mongoose = require('mongoose');
const config = require('./config');

// Connect to MongoDB
async function connectDB() {
    try {
        await mongoose.connect(config.database.uri);
        console.log('✅ Connected to MongoDB');
    } catch (error) {
        console.error('❌ Failed to connect to MongoDB:', error.message);
        process.exit(1);
    }
}

// Clear all users from the database
async function clearDatabase() {
    try {
        const User = require('./models/user');
        
        // Count current users
        const userCount = await User.countDocuments();
        console.log(`📊 Current users in database: ${userCount}`);
        
        if (userCount === 0) {
            console.log('ℹ️  Database is already empty');
            return;
        }
        
        console.log('🔄 Deleting all users...');
        
        // Delete all users
        const result = await User.deleteMany({});
        
        console.log(`✅ Successfully deleted ${result.deletedCount} users`);
        console.log('🗑️  Database cleared successfully');
        
    } catch (error) {
        console.error('❌ Error clearing database:', error.message);
        throw error;
    }
}

// Main execution
async function main() {
    console.log('🧹 Database Clear Tool');
    console.log('========================\n');
    
    await connectDB();
    await clearDatabase();
    
    // Close database connection and exit
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
    process.exit(0);
}

// Handle process termination
process.on('SIGINT', async () => {
    console.log('\n\n⚠️  Process interrupted');
    await mongoose.connection.close();
    process.exit(0);
});

// Run the script
main().catch(async (error) => {
    console.error('❌ Fatal error:', error.message);
    await mongoose.connection.close();
    process.exit(1);
});
