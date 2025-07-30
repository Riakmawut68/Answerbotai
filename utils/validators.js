const config = require('../config');

class Validators {
    // Validate MTN South Sudan mobile number
    static validateMobileNumber(number) {
        if (!number || typeof number !== 'string') {
            return { isValid: false, error: 'Mobile number is required and must be a string' };
        }
        
        const cleanNumber = number.trim();
        
        if (!config.validation.mobileNumberRegex.test(cleanNumber)) {
            return { 
                isValid: false, 
                error: 'Invalid MTN South Sudan number. Must start with 092 followed by 7 digits (e.g., 0921234567)' 
            };
        }
        
        return { isValid: true, value: cleanNumber };
    }

    // Convenience method for quick mobile number validation
    static isValidMobileNumber(number) {
        return this.validateMobileNumber(number).isValid;
    }

    // Validate message content
    static validateMessage(message) {
        if (!message || typeof message !== 'string') {
            return { isValid: false, error: 'Message is required and must be a string' };
        }
        
        const cleanMessage = message.trim();
        
        if (cleanMessage.length === 0) {
            return { isValid: false, error: 'Message cannot be empty' };
        }
        
        if (cleanMessage.length > config.validation.maxMessageLength) {
            return { 
                isValid: false, 
                error: `Message too long. Maximum ${config.validation.maxMessageLength} characters allowed` 
            };
        }
        
        // Check for potentially harmful content
        const harmfulPatterns = [
            /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
            /javascript:/gi,
            /on\w+\s*=/gi,
            /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi
        ];
        
        for (const pattern of harmfulPatterns) {
            if (pattern.test(cleanMessage)) {
                return { isValid: false, error: 'Message contains potentially harmful content' };
            }
        }
        
        return { isValid: true, value: cleanMessage };
    }

    // Validate user stage
    static validateUserStage(stage) {
        const validStages = [
            'initial',
            'awaiting_phone',
            'phone_verified',
            'trial',
            'awaiting_payment',
            'subscribed',
            'payment_failed',
            'subscription_active',
            'subscription_expired'
        ];
        
        if (!validStages.includes(stage)) {
            return { 
                isValid: false, 
                error: `Invalid user stage: ${stage}. Valid stages: ${validStages.join(', ')}` 
            };
        }
        
        return { isValid: true, value: stage };
    }

    // Validate subscription plan
    static validateSubscriptionPlan(plan) {
        const validPlans = ['none', 'weekly', 'monthly'];
        
        if (!validPlans.includes(plan)) {
            return { 
                isValid: false, 
                error: `Invalid subscription plan: ${plan}. Valid plans: ${validPlans.join(', ')}` 
            };
        }
        
        return { isValid: true, value: plan };
    }

    // Validate payment amount
    static validatePaymentAmount(amount, planType) {
        if (typeof amount !== 'number' || amount <= 0) {
            return { isValid: false, error: 'Payment amount must be a positive number' };
        }
        
        const expectedAmount = config.limits.subscriptionPlans[planType]?.price;
        if (expectedAmount && amount !== expectedAmount) {
            return { 
                isValid: false, 
                error: `Invalid payment amount. Expected ${expectedAmount} SSP for ${planType} plan` 
            };
        }
        
        return { isValid: true, value: amount };
    }

    // Validate messenger ID
    static validateMessengerId(messengerId) {
        if (!messengerId || typeof messengerId !== 'string') {
            return { isValid: false, error: 'Messenger ID is required and must be a string' };
        }
        
        const cleanId = messengerId.trim();
        
        if (cleanId.length === 0) {
            return { isValid: false, error: 'Messenger ID cannot be empty' };
        }
        
        // Facebook messenger IDs are typically numeric and long
        if (!/^\d+$/.test(cleanId)) {
            return { isValid: false, error: 'Messenger ID must contain only digits' };
        }
        
        if (cleanId.length < 10) {
            return { isValid: false, error: 'Messenger ID appears to be too short' };
        }
        
        return { isValid: true, value: cleanId };
    }

    // Validate command
    static validateCommand(command) {
        const validCommands = ['resetme', 'cancel', 'start', 'help', 'status'];
        
        if (!command || typeof command !== 'string') {
            return { isValid: false, error: 'Command is required and must be a string' };
        }
        
        const cleanCommand = command.trim().toLowerCase();
        
        if (!validCommands.includes(cleanCommand)) {
            return { 
                isValid: false, 
                error: `Invalid command: ${cleanCommand}. Valid commands: ${validCommands.join(', ')}` 
            };
        }
        
        return { isValid: true, value: cleanCommand };
    }

    // Sanitize user input
    static sanitizeInput(input) {
        if (!input || typeof input !== 'string') {
            return '';
        }
        
        return input
            .trim()
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
            .replace(/[<>"']/g, '') // Remove potentially harmful characters
            .replace(/\s+/g, ' ') // Normalize whitespace
            .substring(0, config.validation.maxMessageLength); // Truncate if too long
    }

    // Validate webhook signature
    static validateWebhookSignature(signature, body, appSecret) {
        if (!signature || !body || !appSecret) {
            return { isValid: false, error: 'Missing required parameters for signature validation' };
        }
        
        const crypto = require('crypto');
        const elements = signature.split('=');
        const signatureHash = elements[1];
        
        if (!signatureHash) {
            return { isValid: false, error: 'Invalid signature format' };
        }
        
        const expectedHash = crypto
            .createHmac('sha256', appSecret)
            .update(JSON.stringify(body))
            .digest('hex');
        
        if (signatureHash !== expectedHash) {
            return { isValid: false, error: 'Invalid signature' };
        }
        
        return { isValid: true };
    }
}

module.exports = Validators; 