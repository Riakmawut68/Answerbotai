# MTN MoMo Collection API Integration Guide

## 📋 Overview

This guide covers the complete MTN MoMo Collection API integration for the Answer Bot AI messenger bot. The integration has been organized into a modular, maintainable structure with proper error handling and comprehensive testing.

## 🏗️ Architecture

### Service Structure

```
services/
├── momoService.js          # Main service orchestrator
└── momo/
    ├── index.js           # Legacy main service (deprecated)
    ├── momoConfig.js      # Configuration management
    ├── momoAuth.js        # Authentication handling
    ├── momoPayments.js    # Payment operations
    └── momoApiUser.js     # API user management
```

### Route Structure

```
routes/
├── webhook.js             # Facebook webhook routes
└── momo.js               # MoMo-specific routes
```

## 🔧 Configuration

### Environment Variables

Required environment variables for MoMo integration:

```bash
# MoMo API Configuration
MOMO_ENVIRONMENT=sandbox|production
MOMO_API_USER_ID=your-api-user-id
MOMO_API_KEY=your-api-key
MOMO_SUBSCRIPTION_KEY=your-subscription-key
CALLBACK_HOST=https://your-domain.com

# Optional
MOMO_BASE_URL=https://sandbox.momodeveloper.mtn.com  # Auto-detected if not set
MOMO_CALLBACK_SECRET=your-callback-secret  # For HMAC verification
```

### Configuration Validation

The system validates all required configuration on startup:

- ✅ UUID format validation for API credentials
- ✅ HTTP/HTTPS URL validation for callback host
- ✅ Environment-specific validation
- ✅ Sandbox mode fallback for missing credentials

## 🚀 API Endpoints

### MoMo Routes (`/momo`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/callback` | POST | Payment callback from MoMo |
| `/status` | GET | Service status and configuration |
| `/diagnose` | GET | Comprehensive service diagnostics |
| `/test` | GET | Connection test |

### Webhook Routes (`/webhook`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Facebook webhook verification |
| `/` | POST | Facebook webhook events |
| `/payment-callback` | POST | Legacy payment callback (deprecated) |

## 💳 Payment Flow

### 1. Payment Initiation

```javascript
const momoService = new MomoService();
const result = await momoService.initiatePayment(user, 'weekly');
```

**Process:**
1. Validate user and plan type
2. Generate unique payment reference
3. Build payment request payload
4. Authenticate with MoMo API
5. Send payment request
6. Update user with payment session
7. Return payment result

### 2. Payment Status Check

```javascript
const status = await momoService.checkPaymentStatus(reference);
```

**Status Values:**
- `PENDING` - Payment request sent, waiting for user action
- `SUCCESSFUL` - Payment completed successfully
- `FAILED` - Payment failed or was cancelled
- `TIMEOUT` - Payment request expired

### 3. Payment Verification

```javascript
const verification = await momoService.verifyPayment(reference);
```

**Verification Process:**
1. Check payment status with MoMo API
2. Validate payment details
3. Return verification result with success/failure status

### 4. Callback Processing

```javascript
// Automatic callback processing via /momo/callback endpoint
const result = await momoService.handlePaymentCallback(callbackData, req);
```

**Callback Data Structure:**
```json
{
  "referenceId": "PAY-1234567890-1234",
  "status": "SUCCESSFUL",
  "amount": "3000",
  "currency": "SSP",
  "payerMessage": "Answer Bot AI weekly subscription"
}
```

## 🔐 Authentication

### Token Management

The system automatically manages MoMo access tokens:

- **Token Caching**: Tokens are cached for efficiency
- **Auto-Refresh**: Tokens are refreshed 5 minutes before expiry
- **Error Handling**: Automatic retry on authentication failures
- **Token Validation**: Built-in token validity checks

### Authentication Flow

1. **Basic Auth**: API User ID + API Key for token requests
2. **Bearer Token**: Access token for API operations
3. **Subscription Key**: Required for all API calls
4. **Environment Headers**: Sandbox/Production environment specification

## 📊 Testing

### Integration Test

Run the comprehensive integration test:

```bash
node test-momo-integration.js
```

**Test Coverage:**
- ✅ Service initialization
- ✅ Configuration validation
- ✅ Authentication testing
- ✅ API user verification
- ✅ Service diagnostics
- ✅ Payment flow simulation
- ✅ Callback handling validation

### Manual Testing

Test individual endpoints:

```bash
# Test service status
curl https://your-domain.com/momo/status

# Test connection
curl https://your-domain.com/momo/test

# Test diagnostics
curl https://your-domain.com/momo/diagnose
```

## 🛠️ Troubleshooting

### Common Issues

#### 1. Configuration Errors

**Problem:** Missing or invalid environment variables
**Solution:** Check all required environment variables are set correctly

```bash
# Validate configuration
node check-env.js
```

#### 2. Authentication Failures

**Problem:** Invalid API credentials
**Solution:** Verify API User ID, API Key, and Subscription Key

```bash
# Test authentication
curl https://your-domain.com/momo/test
```

#### 3. Payment Initiation Failures

**Problem:** Payment requests failing
**Solution:** Check phone number format and API user setup

```bash
# Check API user
curl https://your-domain.com/momo/diagnose
```

#### 4. Callback Issues

**Problem:** Callbacks not being received
**Solution:** Verify callback URL and network connectivity

```bash
# Test callback endpoint
curl -X POST https://your-domain.com/momo/callback \
  -H "Content-Type: application/json" \
  -d '{"referenceId":"test","status":"SUCCESSFUL"}'
```

### Debug Mode

Enable detailed logging by setting log level:

```javascript
// In your environment
LOG_LEVEL=debug
```

### Error Codes

| Error Code | Description | Solution |
|------------|-------------|----------|
| `AUTH_FAILED` | Authentication failed | Check API credentials |
| `INVALID_MSISDN` | Invalid phone number | Verify phone number format |
| `PAYMENT_FAILED` | Payment initiation failed | Check API user setup |
| `CALLBACK_ERROR` | Callback processing failed | Verify callback data |

## 📈 Monitoring

### Health Checks

Monitor service health:

```bash
# Service health
curl https://your-domain.com/health

# MoMo service status
curl https://your-domain.com/momo/status
```

### Logging

Key log events to monitor:

- `MomoService initialized successfully` - Service startup
- `Fetched new MoMo access token` - Authentication
- `Payment initiated successfully` - Payment flow
- `Payment callback processed` - Callback handling
- `Subscription activated successfully` - Payment completion

### Metrics

Track important metrics:

- Payment success rate
- Authentication failures
- Callback processing time
- API response times
- Error rates by operation

## 🔄 Migration Guide

### From Old Integration

If migrating from the old integration:

1. **Update imports**: Use `services/momoService.js` instead of `services/momo/index.js`
2. **Update routes**: Use `/momo/callback` instead of `/webhook/payment-callback`
3. **Test thoroughly**: Run integration tests to verify functionality
4. **Monitor logs**: Watch for any new error patterns

### Breaking Changes

- Callback endpoint moved from `/webhook/payment-callback` to `/momo/callback`
- Service initialization now uses modular structure
- Enhanced error handling and logging
- Improved configuration validation

## 📚 API Reference

### MomoService Class

#### Constructor
```javascript
const momoService = new MomoService();
```

#### Methods

**Payment Operations:**
- `initiatePayment(user, planType)` - Start payment process
- `checkPaymentStatus(reference)` - Check payment status
- `verifyPayment(reference)` - Verify payment completion
- `handlePaymentCallback(callbackData, req)` - Process callbacks

**User Management:**
- `processSuccessfulPayment(user)` - Handle successful payments
- `processFailedPayment(user)` - Handle failed payments

**Testing & Diagnostics:**
- `testConnection()` - Test API connectivity
- `diagnose()` - Run comprehensive diagnostics
- `getServiceInfo()` - Get service status

**Configuration:**
- `calculatePlanAmount(planType)` - Get plan pricing
- `setupNewCredentials()` - Setup new API credentials
- `checkApiUser()` - Verify API user exists

## 🎯 Best Practices

### Security
- ✅ Use HTTPS for all callbacks
- ✅ Validate callback signatures when possible
- ✅ Mask sensitive data in logs
- ✅ Use environment-specific credentials

### Error Handling
- ✅ Implement retry logic for transient failures
- ✅ Log detailed error context
- ✅ Provide user-friendly error messages
- ✅ Handle edge cases gracefully

### Performance
- ✅ Cache authentication tokens
- ✅ Use connection pooling
- ✅ Implement request timeouts
- ✅ Monitor API response times

### Testing
- ✅ Run integration tests regularly
- ✅ Test with sandbox environment first
- ✅ Validate all payment scenarios
- ✅ Test error conditions

## 📞 Support

For issues with the MoMo integration:

1. **Check logs** for detailed error information
2. **Run diagnostics** using `/momo/diagnose` endpoint
3. **Test connectivity** using `/momo/test` endpoint
4. **Verify configuration** using environment validation
5. **Review this guide** for common solutions

---

**Last Updated:** December 2024
**Version:** 2.0.0
**Status:** Production Ready ✅ 