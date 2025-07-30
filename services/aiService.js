const axios = require('axios');
const logger = require('../utils/logger');

class AIService {
    constructor() {
        this.apiKey = process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY; // Support both for backward compatibility
        if (!this.apiKey) {
            throw new Error('Missing OPENROUTER_API_KEY or OPENAI_API_KEY environment variable');
        }
        
        this.apiUrl = 'https://openrouter.ai/api/v1/chat/completions';
        this.model = process.env.AI_MODEL || "mistralai/mistral-nemo:free";
        this.defaultSystemPrompt = process.env.SYSTEM_PROMPT || 'You are a helpful AI assistant focusing on academics, business, agriculture, health, and general knowledge. Provide accurate, concise responses.';
    }

    async generateResponse(userMessage) {
        try {
            // Basic input sanitization
            const sanitizedMessage = userMessage.replace(/[<>"']/g, "").trim();
            if (!sanitizedMessage) {
                throw new Error('Empty or invalid message');
            }
            
            logger.info(`Generating AI response for message: "${sanitizedMessage.substring(0, 50)}${sanitizedMessage.length > 50 ? '...' : ''}"`);
            
            const response = await axios.post(
                this.apiUrl,
                {
                    model: this.model,
                    messages: [
                        {
                            role: 'system',
                            content: this.defaultSystemPrompt
                        },
                        {
                            role: 'user',
                            content: sanitizedMessage
                        }
                    ],
                    max_tokens: Math.min(800, 4096) // Safeguard against exceeding model limits
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
            // Secure error logging - don't expose sensitive data
            logger.error('Error generating AI response:', {
                message: error.message,
                status: error.response?.status,
                statusText: error.response?.statusText,
                code: error.code
                // Removed data field to avoid logging sensitive API responses
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

        // Validate message type
        if (!(messageType in typePrompts)) {
            throw new Error(`Invalid message type: ${messageType}. Valid types: ${Object.keys(typePrompts).join(', ')}`);
        }

        const prompt = typePrompts[messageType];
        return await this.generateResponse(prompt + userMessage);
    }
}

module.exports = new AIService();
