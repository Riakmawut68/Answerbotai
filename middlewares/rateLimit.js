const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');
const config = require('../config');

// General rate limiter for all routes
const generalLimiter = rateLimit({
    windowMs: config.rateLimit.windowMs, // 10 minutes
    max: config.rateLimit.max, // limit each IP to 60 requests per windowMs
    message: {
        error: config.rateLimit.message,
        status: 429,
        timestamp: new Date().toISOString()
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        logger.warn('Rate limit exceeded:', {
            ip: req.ip,
            url: req.url,
            method: req.method,
            userAgent: req.get('User-Agent')
        });
        
        res.status(429).json({
            error: config.rateLimit.message,
            status: 429,
            timestamp: new Date().toISOString()
        });
    }
});

// Stricter rate limiter for webhook endpoints
const webhookLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 100, // limit each IP to 100 requests per 5 minutes
    message: {
        error: 'Too many webhook requests, please try again later.',
        status: 429,
        timestamp: new Date().toISOString()
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        logger.warn('Webhook rate limit exceeded:', {
            ip: req.ip,
            url: req.url,
            method: req.method,
            userAgent: req.get('User-Agent')
        });
        
        res.status(429).json({
            error: 'Too many webhook requests, please try again later.',
            status: 429,
            timestamp: new Date().toISOString()
        });
    }
});

// Rate limiter for AI service endpoints
const aiServiceLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 10, // limit each IP to 10 AI requests per minute
    message: {
        error: 'Too many AI requests, please try again later.',
        status: 429,
        timestamp: new Date().toISOString()
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        logger.warn('AI service rate limit exceeded:', {
            ip: req.ip,
            url: req.url,
            method: req.method,
            userAgent: req.get('User-Agent')
        });
        
        res.status(429).json({
            error: 'Too many AI requests, please try again later.',
            status: 429,
            timestamp: new Date().toISOString()
        });
    }
});

// Rate limiter for health check endpoints
const healthCheckLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 30, // limit each IP to 30 health checks per minute
    message: {
        error: 'Too many health check requests.',
        status: 429,
        timestamp: new Date().toISOString()
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        logger.warn('Health check rate limit exceeded:', {
            ip: req.ip,
            url: req.url,
            method: req.method
        });
        
        res.status(429).json({
            error: 'Too many health check requests.',
            status: 429,
            timestamp: new Date().toISOString()
        });
    }
});

module.exports = {
    generalLimiter,
    webhookLimiter,
    aiServiceLimiter,
    healthCheckLimiter
}; 