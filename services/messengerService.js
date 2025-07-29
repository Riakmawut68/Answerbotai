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

Your intelligent virtual assistant powered by GPT-4.1 Nano. We're pleased to have you on board.

🤖 What Can I Help With?

Answer Bot AI assists with:
- 📚 Academics
- 💼 Business
- 🌱 Agriculture
- 🏥 Health
- ❓ General knowledge

Whether you're a student, professional, or curious learner, I provide fast, intelligent answers to help you solve problems and learn efficiently.

🆓 Free Trial & Subscription

- As a new user, you get 3 free messages every day to explore Answer Bot AI.
- After your daily limit, you'll be prompted to subscribe for premium access.
- Please have your MoMo (Mobile Money) number ready and recharged.
- Pricing:  
  • 3,000 SSP/week (30 messages per day, standard features)  
  • 6,500 SSP/month (30 messages per day, extended features & priority service)

📜 Compliance & Legal Responsibility

Nyamora Co.ltd operates Answer Bot AI in full compliance with:
- Meta's Platform Terms & Developer Policies
- Data privacy laws & user protection
- Mobile money transaction guidelines
- Digital services & e-commerce regulations
- Meta's community standards

We do not engage in unauthorized data collection, deceptive practices, or deliver false/harmful information. All AI responses are responsibly generated.

🔐 Data Privacy Policy

- We collect only essential data (user ID, message count, subscription status).
- No sensitive personal info is accessed, stored, or shared unless needed for service and with your consent.
- Data is used only to operate Answer Bot AI.
- All data is stored securely and never sold or transferred to third parties.
- You can request data deletion at any time.
- We use industry-standard encryption and security practices.

⚖ Terms & Conditions

By using Answer Bot AI, you agree to:
- Use the platform for personal, academic, or professional inquiry only.
- Understand that all responses are AI-generated and not professional advice.
- Not send or promote hate speech, abuse, violence, harassment, or misleadin`;

        const welcomeChunk2 = `g content.
- Misuse or violations may lead to access restrictions or bans.
- Subscription fees are non-refundable once access is granted.
- We may update terms, pricing, or features at any time (you'll be notified).
For help, contact our support team via the app or official channels.

🟢 Consent Required

By tapping "I Agree", you confirm that you have read and accept our Terms, Privacy Policy, and Subscription Conditions. You must agree to use Answer Bot AI.`;

        // Send exactly two chunks
        await this.sendText(recipientId, welcomeChunk1);
        await this.sendText(recipientId, welcomeChunk2);

        // Send consent button with trial option
        const buttons = [
            {
                type: 'postback',
                title: 'I Agree',
                payload: 'I_AGREE'
            },
            {
                type: 'postback',
                title: 'Start Free Trial',
                payload: 'START_TRIAL'
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
