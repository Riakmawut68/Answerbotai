const axios = require('axios');
const logger = require('../utils/logger');

// 1. Centralized Configuration
const config = {
    apiKey: process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY,
    apiUrl: 'https://openrouter.ai/api/v1',
    model: process.env.AI_MODEL || "mistralai/mistral-small-3.2-24b-instruct:free",
    defaultSystemPrompt: process.env.SYSTEM_PROMPT || 'You are a helpful assistant focused on academics, business, agriculture, health, and general knowledge. Always follow these rules: 1) Keep responses under 2000 characters 2) Use plain text only (no formatting, bullets, or bold) 3) For math, use simple text (e.g., 1/2 × b × h) 4) Avoid LaTeX/special notation 5) Be concise unless user requests details.',
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

        // 2. Pre-configured axios instance with timeout and retry logic
        this.apiClient = axios.create({
            baseURL: config.apiUrl,
            timeout: 45000, // Increased to 45 seconds
            headers: {
                ...config.apiHeaders,
                'Authorization': `Bearer ${config.apiKey}`,
            },
        });
    }

    /**
     * Retry function with exponential backoff
     */
    async retryWithBackoff(fn, maxRetries = 3, baseDelay = 1000) {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await fn();
            } catch (error) {
                if (attempt === maxRetries) {
                    throw error;
                }
                
                // Don't retry on certain errors
                if (error.response?.status === 400 || error.response?.status === 401 || error.response?.status === 403) {
                    throw error;
                }
                
                const delay = baseDelay * Math.pow(2, attempt - 1);
                logger.warn(`AI request failed (attempt ${attempt}/${maxRetries}), retrying in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }

    /**
     * Generates a response from the AI model with retry logic.
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
            const response = await this.retryWithBackoff(async () => {
                return await this.apiClient.post('/chat/completions', requestBody);
            });
            
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
            
            // Provide a fallback response for timeout errors
            if (error.code === 'ECONNABORTED' || error.response?.status === 408) {
                logger.warn('AI service timeout, providing fallback response');
                return this.getFallbackResponse(userContent);
            }
            
            throw new Error(`Failed to generate AI response: ${error.message}`);
        }
    }

    /**
     * Provides a fallback response when AI service is unavailable
     */
    getFallbackResponse(userMessage) {
        const fallbackResponses = [
            "I apologize, but I'm experiencing some technical difficulties right now. Please try again in a moment, or feel free to ask your question again.",
            "I'm having trouble processing your request at the moment. Please try again shortly, and I'll be happy to help you.",
            "Due to high demand, I'm a bit slow to respond right now. Please try again in a few seconds.",
            "I'm temporarily unavailable. Please try again in a moment, and I'll assist you with your question."
        ];
        
        const randomIndex = Math.floor(Math.random() * fallbackResponses.length);
        return fallbackResponses[randomIndex];
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

    /**
     * Generates a response for user messages with consistent formatting instructions.
     * @param {string} userMessage - The raw message from the user.
     * @param {Object} [options={}] - Optional parameters to override defaults.
     * @returns {Promise<string>} The AI-generated response with consistent formatting.
     */
    async generateUserResponse(userMessage, options = {}) {
        const sanitizedMessage = userMessage.replace(/[<>"']/g, "").trim();
        if (!sanitizedMessage) {
            throw new Error('Empty or invalid message');
        }

        const messages = [
            { role: 'system', content: config.defaultSystemPrompt },
            { role: 'user', content: sanitizedMessage }
        ];

        return this.generateResponse(messages, options);
    }
}

module.exports = new AIService();
