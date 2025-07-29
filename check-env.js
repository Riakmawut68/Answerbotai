require('dotenv').config();

console.log('🔍 Checking environment variables for Answer Bot AI...\n');

// Required environment variables
const requiredVars = {
    // Database
    'MONGODB_URI': process.env.MONGODB_URI,
    
    // Facebook
    'VERIFY_TOKEN': process.env.VERIFY_TOKEN,
    'PAGE_ACCESS_TOKEN': process.env.PAGE_ACCESS_TOKEN,
    'FB_APP_SECRET': process.env.FB_APP_SECRET,
    
    // AI
    'OPENROUTER_API_KEY': process.env.OPENROUTER_API_KEY,
    'OPENAI_API_KEY': process.env.OPENAI_API_KEY,
    
    // MoMo Payment
    'MOMO_API_USER_ID': process.env.MOMO_API_USER_ID,
    'MOMO_API_KEY': process.env.MOMO_API_KEY,
    'MOMO_SUBSCRIPTION_KEY': process.env.MOMO_SUBSCRIPTION_KEY,
    'MOMO_BASE_URL': process.env.MOMO_BASE_URL,
    'MOMO_EXTERNAL_ID': process.env.MOMO_EXTERNAL_ID,
    'MOMO_ENVIRONMENT': process.env.MOMO_ENVIRONMENT,
    'CALLBACK_HOST': process.env.CALLBACK_HOST,
    
    // App
    'SELF_URL': process.env.SELF_URL,
    'ENCRYPTION_KEY': process.env.ENCRYPTION_KEY
};

let missingVars = [];
let presentVars = [];

console.log('📋 Environment Variables Status:\n');

Object.entries(requiredVars).forEach(([key, value]) => {
    if (!value) {
        missingVars.push(key);
        console.log(`❌ ${key}: MISSING`);
    } else {
        presentVars.push(key);
        // Show first few characters for sensitive keys
        const displayValue = key.includes('KEY') || key.includes('TOKEN') || key.includes('SECRET') 
            ? `${value.substring(0, 8)}...` 
            : value;
        console.log(`✅ ${key}: ${displayValue}`);
    }
});

console.log('\n📊 Summary:');
console.log(`✅ Present: ${presentVars.length}`);
console.log(`❌ Missing: ${missingVars.length}`);

if (missingVars.length > 0) {
    console.log('\n🚨 Missing required environment variables:');
    missingVars.forEach(varName => {
        console.log(`   - ${varName}`);
    });
    
    console.log('\n💡 To fix this:');
    console.log('1. Check your .env file (if using local development)');
    console.log('2. Check your Render environment variables (if deployed)');
    console.log('3. Make sure all required variables are set');
    
    process.exit(1);
} else {
    console.log('\n🎉 All required environment variables are present!');
    console.log('Your application should be able to start successfully.');
}

// Additional MoMo-specific checks
console.log('\n🔧 MoMo Payment Configuration:');
if (process.env.MOMO_BASE_URL) {
    console.log(`   Base URL: ${process.env.MOMO_BASE_URL}`);
}
if (process.env.MOMO_ENVIRONMENT) {
    console.log(`   Environment: ${process.env.MOMO_ENVIRONMENT}`);
}
if (process.env.MOMO_API_KEY) {
    console.log(`   API Key length: ${process.env.MOMO_API_KEY.length} characters`);
}
if (process.env.MOMO_SUBSCRIPTION_KEY) {
    console.log(`   Subscription Key length: ${process.env.MOMO_SUBSCRIPTION_KEY.length} characters`);
} 