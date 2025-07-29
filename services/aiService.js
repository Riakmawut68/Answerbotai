const axios = require('axios');
const logger = require('../utils/logger');

class AIService {
    constructor() {
        this.apiKey = process.env.OPENAI_API_KEY;
        this.apiUrl = 'https://openrouter.ai/api/v1/chat/completions';
    }

    async generateResponse(userMessage, context = []) {
        try {
            logger.info(`Generating AI response for message: "${userMessage.substring(0, 50)}${userMessage.length > 50 ? '...' : ''}"`);
            
            const response = await axios.post(
                this.apiUrl,
                {
                    messages: [
                        { role: 'system', content: 'You are a helpful AI assistant focusing on academics, business, agriculture, health, and general knowledge. Provide accurate, concise responses.' },
                        ...context,
                        { role: 'user', content: userMessage }
                    ],
                    model: 'mistralai/mistral-nemo:free', // Using Mistral AI's free model
                    max_tokens: 800
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json',
                        'HTTP-Referer': 'https://answerbotai.onrender.com', // Required for OpenRouter
                    }
                }
            );

            const aiResponse = response.data.choices[0].message.content.trim();
            logger.info(`AI response generated successfully: "${aiResponse.substring(0, 50)}${aiResponse.length > 50 ? '...' : ''}"`);
            
            return aiResponse;
        } catch (error) {
            logger.error('Error generating AI response:', error.response?.data || error.message);
            throw new Error('Failed to generate AI response');
        }
    }

    // Function to determine if message contains inappropriate content
    async isAppropriateContent(message) {
        try {
            // Simple greetings and common phrases should always be allowed
            const allowedPhrases = [
                'hi', 'hello', 'hey', 'good morning', 'good afternoon', 'good evening',
                'how are you', 'what\'s up', 'thanks', 'thank you', 'bye', 'goodbye',
                'help', 'start', 'begin', 'test', 'hello there', 'hi there'
            ];
            
            const lowerMessage = message.toLowerCase().trim();
            
            // Check if it's a simple greeting or common phrase
            if (allowedPhrases.includes(lowerMessage)) {
                return true;
            }
            
            // For other messages, use AI to check appropriateness
            const response = await this.generateResponse(
                `Analyze this message for inappropriate content. Consider it appropriate if it's a normal question, greeting, or request for help. Only flag as inappropriate if it contains hate speech, violence, harassment, or explicit content. Message: "${message}". Respond with only "APPROPRIATE" or "INAPPROPRIATE".`
            );
            
            return response.toLowerCase().includes('appropriate') && !response.toLowerCase().includes('inappropriate');
        } catch (error) {
            logger.error('Error checking content appropriateness:', error);
            // Default to allowing content if check fails
            return true;
        }
    }

    // Function to format response based on message type
    async getFormattedResponse(userMessage, messageType = 'general') {
        const typePrompts = {
            academic: 'Focusing on academic context: ',
            business: 'From a business perspective: ',
            agriculture: 'Regarding agriculture: ',
            health: 'Concerning health (Note: This is general information, not medical advice): ',
            general: ''
        };

        const prompt = typePrompts[messageType] || '';
        return await this.generateResponse(prompt + userMessage);
    }
}

module.exports = new AIService();
