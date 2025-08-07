require('dotenv').config();
const mongoose = require('mongoose');
const config = require('./config');
const logger = require('./utils/logger');
const WorkingPaymentFlowTester = require('./test-complete-payment-flow-working');

async function connectToDatabase() {
    try {
        console.log('🔌 Connecting to MongoDB...');
        console.log(`   - URI: ${config.database.uri ? 'Configured' : 'Missing'}`);
        console.log(`   - Environment: ${config.app.environment}`);
        
        await mongoose.connect(config.database.uri, config.database.options);
        console.log('✅ MongoDB Connected Successfully');
        
        // Test database connection
        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log(`   - Available collections: ${collections.map(c => c.name).join(', ')}`);
        
    } catch (error) {
        console.error('❌ MongoDB Connection Error:', error.message);
        console.error('Please check your database configuration in .env file');
        process.exit(1);
    }
}

async function runWorkingPaymentFlowTest() {
    console.log('\n🧪 WORKING PAYMENT FLOW TEST RUNNER');
    console.log('=' .repeat(50));
    console.log(`📅 Test started at: ${new Date().toISOString()}`);
    console.log(`🔧 Environment: ${config.app.environment}`);
    console.log(`📦 Version: ${config.app.version}`);
    console.log(`💰 Currency: ${config.momo.getPaymentCurrency()}`);
    console.log(`💳 Weekly Amount: ${config.momo.getPaymentAmount('weekly')} ${config.momo.getPaymentCurrency()}`);
    console.log(`💳 Monthly Amount: ${config.momo.getPaymentAmount('monthly')} ${config.momo.getPaymentCurrency()}`);
    
    try {
        // Connect to database
        await connectToDatabase();
        
        // Run the working payment flow test
        const tester = new WorkingPaymentFlowTester();
        await tester.runCompleteTest();
        
        console.log('\n🎊 WORKING PAYMENT FLOW TEST COMPLETED SUCCESSFULLY!');
        console.log('=' .repeat(50));
        
    } catch (error) {
        console.error('\n💥 TEST RUNNER FAILED:', error.message);
        console.error('Stack trace:', error.stack);
        process.exit(1);
    } finally {
        // Cleanup
        console.log('\n🧹 Cleaning up...');
        try {
            await mongoose.connection.close();
            console.log('✅ Database connection closed');
        } catch (error) {
            console.error('❌ Error closing database connection:', error.message);
        }
        
        console.log('🏁 Test runner finished');
        process.exit(0);
    }
}

// Run the test
runWorkingPaymentFlowTest();
