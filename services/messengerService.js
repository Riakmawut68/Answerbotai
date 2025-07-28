const axios = require('axios');
const logger = require('../utils/logger');

class MessengerService {
    constructor() {
        this.pageAccessToken = process.env.PAGE_ACCESS_TOKEN;
        this.apiVersion = 'v17.0'; // Update this as needed
        this.baseUrl = `https://graph.facebook.com/${this.apiVersion}/me/messages`;
    }

    async sendMessage(recipientId, message) {
        try {
            const response = await axios.post(this.baseUrl, {
                recipient: { id: recipientId },
                message: message
            }, {
                params: { access_token: this.pageAccessToken }
            });
            return response.data;
        } catch (error) {
            logger.error('Error sending message:', error.response?.data || error.message);
            throw error;
        }
    }

    async sendText(recipientId, text) {
        return this.sendMessage(recipientId, { text });
    }

    async sendQuickReplies(recipientId, text, quickReplies) {
        return this.sendMessage(recipientId, {
            text,
            quick_replies: quickReplies
        });
    }

    async sendButtonTemplate(recipientId, text, buttons) {
        return this.sendMessage(recipientId, {
            attachment: {
                type: 'template',
                payload: {
                    template_type: 'button',
                    text,
                    buttons
                }
            }
        });
    }

    // Send the welcome message with terms and consent
    async sendWelcomeMessage(recipientId) {
        const welcomeText = `👋 Welcome to Answer Bot AI!

Your intelligent virtual assistant powered by GPT-4.1 Nano. We're pleased to have you on board.

🤖 What Can I Help With?
Answer Bot AI assists with:
- 📚 Academics
- 💼 Business
- 🌱 Agriculture
- 🏥 Health
- ❓ General knowledge

🆓 Free Trial & Subscription
- 3 free messages per day to explore Answer Bot AI
- After that, subscribe for premium access
- Pricing:
  • 3,000 SSP/week – 30 messages/day
  • 6,500 SSP/month – 30 messages/day + extended features

📜 Legal Notice
Operated by Nyamora Co. Ltd in compliance with Meta's policies, data privacy laws, and mobile money regulations.

🔐 Privacy Policy
We only store:
- Your Messenger ID
- Mobile number (if provided)
- Message count and subscription status

⚖️ Terms & Conditions
Use responsibly. AI responses are not professional advice. Hate speech, abuse, or misuse will lead to bans. Subscriptions are non-refundable.

🟢 Consent Required`;

        // Send welcome message in chunks due to Facebook's message length limits
        const chunks = this.chunkMessage(welcomeText, 2000);
        for (const chunk of chunks) {
            await this.sendText(recipientId, chunk);
        }

        // Send consent button
        return this.sendButtonTemplate(recipientId, 
            "By clicking \"I Agree\", you confirm that you've read and accepted our Terms, Privacy Policy, and Subscription Conditions.",
            [{
                type: 'postback',
                title: 'I Agree',
                payload: 'I_AGREE'
            }]
        );
    }

    // Helper to chunk long messages
    chunkMessage(text, maxLength) {
        const chunks = [];
        let currentChunk = '';

        const paragraphs = text.split('\n\n');
        
        for (const paragraph of paragraphs) {
            if (currentChunk.length + paragraph.length + 2 <= maxLength) {
                currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
            } else {
                if (currentChunk) chunks.push(currentChunk);
                currentChunk = paragraph;
            }
        }
        
        if (currentChunk) chunks.push(currentChunk);
        return chunks;
    }
}

module.exports = new MessengerService();
