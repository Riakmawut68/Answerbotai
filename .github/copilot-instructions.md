# Copilot Instructions for Answer Bot AI

This is a Facebook Messenger bot project that:
- Uses Express.js for the webhook server
- Integrates with OpenAI API for AI responses
- Handles MTN MoMo payments for subscriptions
- Uses MongoDB for data storage
- Implements user onboarding and subscription flows

Key aspects to consider when generating code:
1. Follow Facebook Messenger Platform best practices
2. Implement proper error handling and logging
3. Follow MongoDB schema design patterns
4. Use async/await for asynchronous operations
5. Validate inputs thoroughly
6. Maintain security best practices for payment handling

## Project Structure
- config/ - Configuration files
- routes/ - Express routes
- controllers/ - Request handlers
- services/ - Business logic
- models/ - Mongoose models
- middlewares/ - Express middlewares
- utils/ - Utility functions
- logs/ - Application logs

## Validation Rules
- Phone numbers must match MTN South Sudan format (092xxxxxxx)
- Messages must be tracked for trial and subscription limits
- All MongoDB operations should use try-catch blocks
- Payment validation must be thorough and secure

## Error Handling
- Use the logger utility for all errors
- Implement proper error responses
- Handle webhook verification errors carefully
- Track and log all payment-related issues
