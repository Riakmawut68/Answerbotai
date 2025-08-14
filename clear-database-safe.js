#!/usr/bin/env node

const mongoose = require('mongoose');
const readline = require('readline');
const config = require('./config');

// Create readline interface for user input
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

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
        const User = require('./models/User');
        
        // Count current users
        const userCount = await User.countDocuments();
        console.log(`📊 Current users in database: ${userCount}`);
        
        if (userCount === 0) {
            console.log('ℹ️  Database is already empty');
            return;
        }
        
        // Ask for confirmation
        console.log('\n⚠️  WARNING: This will delete ALL users from the database!');
        console.log('Type "DELETE ALL" to confirm, or anything else to cancel.');
        
        rl.question('\nConfirmation: ', async (answer) => {
            if (answer === 'DELETE ALL') {
                console.log('\n🔄 Deleting all users...');
                
                // Delete all users
                const result = await User.deleteMany({});
                
                console.log(`✅ Successfully deleted ${result.deletedCount} users`);
                console.log('🗑️  Database cleared successfully');
                
            } else {
                console.log('❌ Operation cancelled');
            }
            
            // Close database connection and exit
            await mongoose.connection.close();
            console.log('🔌 Database connection closed');
            rl.close();
            process.exit(0);
        });
        
    } catch (error) {
        console.error('❌ Error clearing database:', error.message);
        await mongoose.connection.close();
        rl.close();
        process.exit(1);
    }
}

// Main execution
async function main() {
    console.log('🧹 Database Clear Tool (Safe Mode)');
    console.log('=====================================\n');
    
    await connectDB();
    await clearDatabase();
}

// Handle process termination
process.on('SIGINT', async () => {
    console.log('\n\n⚠️  Process interrupted');
    await mongoose.connection.close();
    rl.close();
    process.exit(0);
});

// Run the script
main().catch(async (error) => {
    console.error('❌ Fatal error:', error.message);
    await mongoose.connection.close();
    rl.close();
    process.exit(1);
});
