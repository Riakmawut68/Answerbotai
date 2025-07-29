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
                    model: "mistralai/mistral-nemo:free",
                    messages: [
                        {
                            role: 'system',
                            content: 'You are a helpful AI assistant focusing on academics, business, agriculture, health, and general knowledge. Provide accurate, concise responses.'
                        },
                        ...context,
                        {
                            role: 'user',
                            content: userMessage
                        }
                    ],
                    max_tokens: 800
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json',
                        'HTTP-Referer': 'https://answerbotai.onrender.com',
                        'X-Title': 'Answer Bot AI',
                    }
                }
            );

            const aiResponse = response.data.choices[0].message.content.trim();
            logger.info(`AI response generated successfully: "${aiResponse.substring(0, 50)}${aiResponse.length > 50 ? '...' : ''}"`);
            
            return aiResponse;
        } catch (error) {
            logger.error('Error generating AI response:', {
                message: error.message,
                status: error.response?.status,
                statusText: error.response?.statusText,
                data: error.response?.data,
                code: error.code
            });
            throw new Error(`Failed to generate AI response: ${error.message}`);
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
