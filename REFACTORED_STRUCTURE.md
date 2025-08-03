# Refactored MoMo Collection API Integration

This document outlines the improved structure for the MTN MoMo Collection API integration in your Answer Bot AI project.

## 🎯 Overview

The refactoring addresses the following improvements:

1. **Separation of Concerns**: Facebook webhooks and MoMo callbacks are now handled by separate controllers
2. **Enhanced Configuration**: Robust environment variable validation using Joi
3. **Better Service Organization**: Cleaner service architecture with dedicated payment processing
4. **Improved Error Handling**: Centralized error handling and validation
5. **Production-Ready Structure**: Better organized for scalability and maintenance

## 📁 New Project Structure

```
my-messenger-bot/
├── app.js                          # New main application entry point
├── server.js                       # Original server (kept for compatibility)
├── config/
│   └── index.js                    # Enhanced with Joi validation
├── controllers/
│   ├── messengerController.js      # Facebook webhook handling
│   ├── momoController.js           # MoMo payment callbacks
│   └── webhookController.js        # Original (kept for compatibility)
├── services/
│   ├── paymentProcessingService.js # New payment orchestration service
│   ├── momoService.js              # Enhanced MoMo service
│   └── momo/                       # Existing MoMo modules
├── routes/
│   ├── webhook.js                  # Updated Facebook routes
│   └── momo.js                     # New MoMo routes
├── scripts/
│   └── setupMomoApiUser.js         # Enhanced setup script
├── env.example                     # Comprehensive environment template
└── package.json                    # Updated with new dependencies
```

## 🚀 Key Improvements

### 1. Enhanced Configuration (`config/index.js`)

- **Joi Validation**: All environment variables are validated on startup
- **Type Safety**: Proper type checking for all configuration values
- **Better Error Messages**: Clear error messages for missing/invalid variables

```javascript
// Example validation
const envVarsSchema = Joi.object({
    MOMO_API_USER_ID: Joi.string().uuid().required(),
    MOMO_API_KEY: Joi.string().uuid().required(),
    // ... more validations
});
```

### 2. Separated Controllers

**`controllers/messengerController.js`**
- Handles Facebook webhook verification and events
- Processes user messages and postbacks
- Manages user flow and AI responses

**`controllers/momoController.js`**
- Handles MoMo payment callbacks
- Provides health check and diagnostic endpoints
- Separates payment concerns from messaging

### 3. Payment Processing Service (`services/paymentProcessingService.js`)

- **Orchestration Layer**: Coordinates between user logic and MoMo API
- **Error Handling**: Centralized payment error handling
- **User Notifications**: Manages payment status notifications
- **Validation**: Validates payment requests before processing

### 4. Enhanced Setup Script (`scripts/setupMomoApiUser.js`)

- **Better Error Handling**: Comprehensive error messages and troubleshooting
- **Validation**: Tests credentials after creation
- **Clear Instructions**: Step-by-step setup guidance
- **Reusable**: Can be imported and used programmatically

## 🔧 Installation & Setup

### 1. Install New Dependencies

```bash
npm install joi uuid
```

### 2. Environment Configuration

Copy `env.example` to `.env` and configure:

```bash
cp env.example .env
```

### 3. Validate Environment

```bash
npm run check-env
```

### 4. Setup MoMo API User

```bash
npm run setup-momo
```

### 5. Start Application

```bash
# Using new structure
npm start

# Or for development
npm run dev
```

## 📡 API Endpoints

### Facebook Messenger
- `GET /webhook` - Webhook verification
- `POST /webhook` - Message handling

### MoMo Payments
- `POST /momo/callback` - Payment callbacks
- `GET /momo/health` - Service health check
- `GET /momo/diagnose` - Service diagnostics

### General
- `GET /health` - Application health check
- `GET /` - Root endpoint

## 🔄 Migration Guide

### From Old Structure

1. **Update Entry Point**: Change `main` in `package.json` to `app.js`
2. **Update Scripts**: Use new npm scripts
3. **Environment Variables**: Use the new `env.example` template
4. **Routes**: Update to use new route structure

### Backward Compatibility

The original `server.js` and `webhookController.js` are preserved for backward compatibility. You can gradually migrate to the new structure.

## 🧪 Testing

### Environment Validation
```bash
npm run check-env
```

### MoMo Integration Test
```bash
npm run test-momo
```

### Health Check
```bash
curl https://your-app.com/health
```

### MoMo Health Check
```bash
curl https://your-app.com/momo/health
```

## 🔍 Troubleshooting

### Common Issues

1. **Configuration Errors**: Run `npm run check-env` to validate environment
2. **MoMo Setup Issues**: Use `npm run setup-momo` with troubleshooting tips
3. **Payment Callbacks**: Check `/momo/diagnose` endpoint for service status

### Debug Endpoints

- `/momo/health` - Service health status
- `/momo/diagnose` - Detailed service diagnostics
- `/health` - Application health check

## 📈 Benefits

1. **Maintainability**: Cleaner separation of concerns
2. **Scalability**: Better organized for future enhancements
3. **Reliability**: Robust error handling and validation
4. **Developer Experience**: Clear structure and documentation
5. **Production Ready**: Proper logging and monitoring endpoints

## 🔮 Future Enhancements

The new structure enables:

- **Microservices**: Easy to split into separate services
- **Testing**: Better testability with separated concerns
- **Monitoring**: Dedicated health and diagnostic endpoints
- **Documentation**: Clear API documentation structure
- **Deployment**: Easier deployment and configuration management

## 📞 Support

For issues or questions about the refactored structure:

1. Check the troubleshooting section
2. Review the diagnostic endpoints
3. Validate your environment configuration
4. Test the MoMo integration step by step

---

**Note**: This refactoring maintains full backward compatibility while providing a more robust and maintainable structure for your MoMo Collection API integration. 