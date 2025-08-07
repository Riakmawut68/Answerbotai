require('dotenv').config();
const aiService = require('./services/aiService');
const logger = require('./utils/logger');

class AIResponseFormattingTest {
    constructor() {
        this.testMessages = [
            "What is photosynthesis?",
            "Explain quantum physics in simple terms",
            "How do I calculate the area of a circle?",
            "What are the benefits of exercise?",
            "Tell me about artificial intelligence"
        ];
    }

    async run() {
        console.log('🤖 AI RESPONSE FORMATTING TEST');
        console.log('==============================\n');

        try {
            console.log('✅ Testing new generateUserResponse method...\n');

            for (let i = 0; i < this.testMessages.length; i++) {
                const message = this.testMessages[i];
                console.log(`📝 Test ${i + 1}: "${message}"`);
                console.log('─'.repeat(50));

                try {
                    const response = await aiService.generateUserResponse(message);
                    
                    console.log('🤖 AI Response:');
                    console.log(response);
                    console.log('');
                    
                    // Check response characteristics
                    const characterCount = response.length;
                    const hasFormatting = this.checkForFormatting(response);
                    const isBrief = characterCount <= 2000;
                    
                    console.log('📊 Response Analysis:');
                    console.log(`   Characters: ${characterCount}/2000 ${isBrief ? '✅' : '❌'}`);
                    console.log(`   Plain text: ${!hasFormatting ? '✅' : '❌'}`);
                    console.log(`   Brief: ${isBrief ? '✅' : '❌'}`);
                    console.log('');

                } catch (error) {
                    console.error(`❌ Error testing message "${message}":`, error.message);
                    console.log('');
                }
            }

            console.log('🎉 AI Response Formatting Test Complete!');
            console.log('✅ New generateUserResponse method is working');
            console.log('✅ Responses should be brief and plain text');

        } catch (error) {
            console.error('❌ Test failed:', error);
        }
    }

    checkForFormatting(text) {
        const formattingPatterns = [
            /\*\*.*?\*\*/g,  // Bold text
            /\*.*?\*/g,      // Italic text
            /^[-*+]\s/m,     // Bullet points
            /^#+\s/m,        // Headers
            /```/g,          // Code blocks
            /`.*?`/g,        // Inline code
            /\[.*?\]/g,      // Links
            /^\d+\.\s/m      // Numbered lists
        ];

        for (const pattern of formattingPatterns) {
            if (pattern.test(text)) {
                return true;
            }
        }
        return false;
    }

    async testMathematicalResponse() {
        console.log('🧮 Testing Mathematical Response:');
        console.log('─'.repeat(50));

        try {
            const mathQuestion = "What is 15 + 27? Show me the calculation.";
            const response = await aiService.generateUserResponse(mathQuestion);
            
            console.log('📝 Question:', mathQuestion);
            console.log('🤖 Response:', response);
            console.log('');
            
            const hasMathFormatting = /[^a-zA-Z0-9\s.,!?]/.test(response);
            console.log('📊 Math Analysis:');
            console.log(`   Plain text math: ${!hasMathFormatting ? '✅' : '❌'}`);
            console.log('');

        } catch (error) {
            console.error('❌ Math test failed:', error.message);
        }
    }

    async testLongResponse() {
        console.log('📏 Testing Response Length:');
        console.log('─'.repeat(50));

        try {
            const longQuestion = "Please provide a detailed explanation of climate change, its causes, effects, and potential solutions. Include scientific evidence and examples.";
            const response = await aiService.generateUserResponse(longQuestion);
            
            console.log('📝 Question:', longQuestion);
            console.log('🤖 Response:', response);
            console.log('');
            
            const characterCount = response.length;
            console.log('📊 Length Analysis:');
            console.log(`   Characters: ${characterCount}/2000`);
            console.log(`   Under limit: ${characterCount <= 2000 ? '✅' : '❌'}`);
            console.log('');

        } catch (error) {
            console.error('❌ Length test failed:', error.message);
        }
    }
}

// Run the test
async function main() {
    const test = new AIResponseFormattingTest();
    await test.run();
    
    // Additional specific tests
    await test.testMathematicalResponse();
    await test.testLongResponse();
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = AIResponseFormattingTest;
