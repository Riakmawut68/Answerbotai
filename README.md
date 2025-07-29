# Answer Bot AI - Facebook Messenger Bot

A production-grade Messenger Webhook Bot for Answer Bot AI, featuring full onboarding automation, subscription handling, and AI-powered replies.

## Features

- Welcome message and user onboarding
- User consent capture
- MTN South Sudan number validation
- Free trial system (3 messages/day)
- MTN MoMo subscription payments
- OpenAI-powered responses
- Activity and error logging
- Weekly and monthly subscription plans

## Prerequisites

- Node.js v16 or higher
- MongoDB
- Facebook Developer Account
- MTN MoMo API Access
- OpenAI API Key

## Setup Guide

1. Clone the repository
2. Copy `.env.example` to `.env` and fill in your credentials
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```

## Webhook Setup for Facebook

1. Create a Facebook App in the Meta Developer Console
2. Set up Messenger webhook with your deployment URL
3. Configure the verify token in your .env file
4. Add required Messenger permissions
5. Generate and configure your Page Access Token

## MTN MoMo Test Setup (Sandbox)

1. Register for MTN MoMo API access
2. Generate API credentials in the sandbox environment
3. Update .env with your MTN MoMo credentials
4. Test payments using sandbox phone numbers

## Usage Limits

- Free Trial: 3 messages per day
- Weekly Plan (3,000 SSP): 30 messages per day
- Monthly Plan (6,500 SSP): 30 messages per day + extended features

## Environment Variables

The following environment variables are required for the application to function properly:

### Required Variables
- `MONGODB_URI` - MongoDB connection string
- `VERIFY_TOKEN` - Facebook webhook verification token
- `PAGE_ACCESS_TOKEN` - Facebook page access token
- `FB_APP_SECRET` - Facebook app secret
- `OPENROUTER_API_KEY` or `OPENAI_API_KEY` - AI service API key
- `MOMO_API_USER_ID` - MTN MoMo API user ID
- `MOMO_API_KEY` - MTN MoMo API key
- `MOMO_SUBSCRIPTION_KEY` - MTN MoMo subscription key
- `MOMO_BASE_URL` - MTN MoMo API base URL
- `MOMO_EXTERNAL_ID` - MTN MoMo external ID
- `MOMO_ENVIRONMENT` - MTN MoMo environment (sandbox/production)
- `CALLBACK_HOST` - Callback host for payment notifications
- `SELF_URL` - Your application's public URL
- `ENCRYPTION_KEY` - Encryption key for sensitive data

### Environment Check
Run the environment check script to verify all variables are set:
```bash
node check-env.js
```

## Common Troubleshooting

### Payment Issues
- **401 Unauthorized**: Check MTN MoMo API credentials and subscription key
- **Missing environment variables**: Run `node check-env.js` to identify missing variables
- **Invalid mobile number**: Ensure number format is 092xxxxxxx

### General Issues
- Check MongoDB connection string
- Verify MTN MoMo API credentials
- Ensure webhook URL is accessible
- Check logs in ./logs directory for detailed error information

## License

This project is operated by Nyamora Co. Ltd
