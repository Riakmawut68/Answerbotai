const commandService = require('./services/commandService');

// Mock user for testing
const mockUser = {
    messengerId: '1234567890123456',
    stage: 'trial',
    trialMessagesUsedToday: 1,
    hasUsedTrial: true
};

async function showHelpMessage() {
    console.log('📋 Current Help Message for Users:\n');
    console.log('=' .repeat(50));
    
    try {
        // Call the help handler directly
        const result = await commandService.handleHelp(mockUser, 'help');
        
        console.log('✅ Help message processed successfully');
        console.log('Result:', result);
        
    } catch (error) {
        console.log('❌ Error:', error.message);
    }
    
    console.log('\n' + '=' .repeat(50));
    console.log('\n📝 Help Message Content (from code):\n');
    
    console.log('🤖 Answer Bot AI – Help Guide');
    console.log('');
    console.log('📚 How to Use');
    console.log('');
    console.log('Ask questions on academics, business, health, agriculture, or general knowledge');
    console.log('');
    console.log('Keep questions clear & specific for the best answers');
    console.log('');
    console.log('🆓 Free vs. Premium');
    console.log('');
    console.log('Free: 3 messages/day (new users)');
    console.log('Premium: 30 messages/day');
    console.log('Weekly: 3,000 SSP');
    console.log('Monthly: 6,500 SSP');
    console.log('');
    console.log('⚠️ Important Notes');
    console.log('');
    console.log('Payments are non-refundable');
    console.log('Daily limits reset at midnight (Juba time)');
    console.log('Available 24/7');
    console.log('');
    console.log('🔧 Commands');
    console.log('');
    console.log('start – Restart the bot');
    console.log('cancel – Stop current action');
    console.log('help – Show this guide again');
    console.log('');
    console.log('📧 Support: riakmawut3@gmail.com');
}

// Run the test
showHelpMessage();
