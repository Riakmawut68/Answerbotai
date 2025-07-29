const axios = require('axios');
const logger = require('../utils/logger');

class AIService {
    constructor() {
        this.apiKey = process.env.OPENAI_API_KEY;
        this.apiUrl = 'https://openrouter.ai/api/v1/chat/completions';
    }

    async generateResponse(userMessage, context = []) {
        try {
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

            return response.data.choices[0].message.content.trim();
        } catch (error) {
            logger.error('Error generating AI response:', error);
            throw new Error('Failed to generate AI response');
        }
    }

    // Function to determine if message contains inappropriate content
    async isAppropriateContent(message) {
        try {
            const response = await this.generateResponse(
                `Please analyze if this message contains any inappropriate, harmful, or offensive content. Respond with only "true" if it's appropriate or "false" if it's inappropriate: "${message}"`
            );
            return response.toLowerCase().includes('true');
        } catch (error) {
            logger.error('Error checking content appropriateness:', error);
            return false;
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
