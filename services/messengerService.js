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

    async sendWelcomeMessage(recipientId) {
        const welcomeChunk1 = `👋 Welcome to Answer Bot AI!

Your trusted educational assistant powered by advanced AI - designed for South Sudanese learners and professionals.

📚 What I Can Help With

Instant answers in:
• Academics (science, math, literature)
• Business (startups, finance, marketing)
• Agriculture (crop advice, livestock)
• Health (wellness, nutrition)
• General knowledge (current events, local info)

🆓 Free Trial & Premium Access

NEW USER BONUS: 3 free messages today!

Premium Benefits (After trial):
• 30 messages/day
• Priority responses
• Extended topic coverage

Subscription Plans:
Weekly: 3,000 SSP (30 messages/day)
Monthly: 6,500 SSP (30 messages/day)

Payment via MTN MoMo - no banking details stored

🔒 Your Privacy & Data Security

Strict safeguards:
• AES-256 encryption for all data
• Servers located in secure cloud infrastructure
• Zero third-party data sharing
• Automatic deletion after 30 days inactivity
• Delete anytime: Message DELETE MY DATA

⚖ Terms of Use

By proceeding, you agree:
• Use for personal/educational purposes only
• AI responses ≠ professional advice
• No illegal/harmful content
• Subscription fees non-refundable after access
• Service may evolve with notice

Full compliance with:
• Meta Platform Terms
• South Sudan Data Protection Laws
• MTN MoMo Transaction Policies

📋 Important Links
Privacy Policy: https://nyamora-digital-gateway.web.app/privacy
Terms of Service: https://nyamora-digital-gateway.web.app/terms
Data Deletion Guide: https://nyamora-digital-gateway.web.app/data-deletion`;

        const welcomeChunk2 = `📋 Additional Terms

• Misuse or violations may lead to access restrictions or bans
• Subscription fees are non-refundable once access is granted
• We may update terms, pricing, or features at any time (you'll be notified)
• For help, contact our support team via the app or official channels

🟢 Consent Required

By tapping "I Agree", you confirm that you have read and accept our Terms, Privacy Policy, and Subscription Conditions. You must agree to use Answer Bot AI.`;

        // Send exactly two chunks
        await this.sendText(recipientId, welcomeChunk1);
        await this.sendText(recipientId, welcomeChunk2);

        // Send consent button only
        const buttons = [
            {
                type: 'postback',
                title: 'I Agree',
                payload: 'I_AGREE'
            }
        ];

        return this.sendButtonTemplate(recipientId,
            "🟢 By clicking \"I Agree\", you confirm that you've read and accepted our Terms, Privacy Policy, and Subscription Conditions.",
            buttons
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
