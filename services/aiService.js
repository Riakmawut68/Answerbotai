const axios = require('axios');
const logger = require('../utils/logger');

// 1. Centralized Configuration
const config = {
    apiKey: process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY,
    apiUrl: 'https://openrouter.ai/api/v1',
    model: process.env.AI_MODEL || "mistralai/mistral-nemo:free",
    defaultSystemPrompt: process.env.SYSTEM_PROMPT || 'You are a helpful AI assistant focusing on academics, business, agriculture, health, and general knowledge. Provide accurate, concise responses.',
    maxTokens: 800,
    apiHeaders: {
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://answerbotai.onrender.com', // Optional: Move to .env
        'X-Title': 'Answer Bot AI', // Optional: Move to .env
    }
};

const typePrompts = {
    academic: 'Focusing on academic context: ',
    business: 'From a business perspective: ',
    agriculture: 'Regarding agriculture: ',
    health: 'Concerning health (Note: This is general information, not medical advice): ',
    general: ''
};

class AIService {
    constructor() {
        if (!config.apiKey) {
            throw new Error('Missing OPENROUTER_API_KEY or OPENAI_API_KEY environment variable');
        }

        // 2. Pre-configured axios instance with timeout
        this.apiClient = axios.create({
            baseURL: config.apiUrl,
            timeout: 30000, // 30 second timeout
            headers: {
                ...config.apiHeaders,
                'Authorization': `Bearer ${config.apiKey}`,
            },
        });
    }

    /**
     * Generates a response from the AI model.
     * @param {Array<Object>} messages - The array of message objects (e.g., [{ role: 'user', content: 'Hello' }]).
     * @param {Object} [options={}] - Optional parameters to override defaults.
     * @param {string} [options.model] - The AI model to use.
     * @param {number} [options.maxTokens] - The maximum number of tokens for the response.
     * @returns {Promise<string>} The AI-generated response text.
     */
    async generateResponse(messages, options = {}) {
        // 3. More flexible method signature
        if (!messages || messages.length === 0) {
            throw new Error('Messages array cannot be empty.');
        }

        const requestBody = {
            model: options.model || config.model,
            messages: messages,
            max_tokens: options.maxTokens || config.maxTokens,
        };

        const userContent = messages[messages.length - 1]?.content || 'N/A';
        logger.info(`Generating AI response for message: "${userContent.substring(0, 50)}..."`);
        
        try {
            const response = await this.apiClient.post('/chat/completions', requestBody);
            const aiResponse = response.data.choices[0].message.content.trim();

            logger.info(`AI response generated successfully: "${aiResponse.substring(0, 50)}..."`);
            return aiResponse;

        } catch (error) {
            logger.error('Error generating AI response:', {
                message: error.message,
                status: error.response?.status,
                statusText: error.response?.statusText,
                code: error.code,
            });
            throw new Error(`Failed to generate AI response: ${error.message}`);
        }
    }

    /**
     * Gets a formatted response for a specific message type.
     * @param {string} userMessage - The raw message from the user.
     * @param {string} [messageType='general'] - The type of message (e.g., 'academic', 'business').
     * @returns {Promise<string>} The formatted AI response.
     */
    async getFormattedResponse(userMessage, messageType = 'general') {
        const sanitizedMessage = userMessage.replace(/[<>"']/g, "").trim();
        if (!sanitizedMessage) {
            throw new Error('Empty or invalid message');
        }
        
        // Validate message type
        if (!(messageType in typePrompts)) {
            throw new Error(`Invalid message type: ${messageType}. Valid types: ${Object.keys(typePrompts).join(', ')}`);
        }
        
        // 4. Decouple prompt creation from the core API call method
        const contextualPrompt = typePrompts[messageType] + sanitizedMessage;

        const messages = [
            { role: 'system', content: config.defaultSystemPrompt },
            { role: 'user', content: contextualPrompt }
        ];

        return this.generateResponse(messages);
    }
}

module.exports = new AIService();
