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

## Common Troubleshooting

- Check MongoDB connection string
- Verify MTN MoMo API credentials
- Ensure webhook URL is accessible
- Check logs in ./logs directory for detailed error information

## License

This project is operated by Nyamora Co. Ltd
