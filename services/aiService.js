const OpenAI = require('openai');
const logger = require('../utils/logger');

class AIService {
    constructor() {
        this.openai = new OpenAI({
            baseURL: "https://openrouter.ai/api/v1",
            apiKey: process.env.OPENAI_API_KEY,
            defaultHeaders: {
                "HTTP-Referer": "https://answerbotai.onrender.com",
                "X-Title": "Answer Bot AI",
            },
        });
    }

    async generateResponse(userMessage, context = []) {
        try {
            logger.info(`Generating AI response for message: "${userMessage.substring(0, 50)}${userMessage.length > 50 ? '...' : ''}"`);
            
            const completion = await this.openai.chat.completions.create({
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
            });

            const aiResponse = completion.choices[0].message.content.trim();
            logger.info(`AI response generated successfully: "${aiResponse.substring(0, 50)}${aiResponse.length > 50 ? '...' : ''}"`);
            
            return aiResponse;
        } catch (error) {
            logger.error('Error generating AI response:', error.message);
            throw new Error('Failed to generate AI response');
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
