const logger = require('../utils/logger');
const config = require('../config');

// Error handling middleware
const errorHandler = (err, req, res, next) => {
    // Log the error with context
    logger.error('Application Error:', {
        message: err.message,
        stack: err.stack,
        url: req.url,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString()
    });

    // Determine error type and response
    let statusCode = 500;
    let errorMessage = 'Internal Server Error';

    // Handle specific error types
    if (err.name === 'ValidationError') {
        statusCode = 400;
        errorMessage = 'Validation Error';
    } else if (err.name === 'CastError') {
        statusCode = 400;
        errorMessage = 'Invalid ID format';
    } else if (err.code === 11000) {
        statusCode = 409;
        errorMessage = 'Duplicate entry';
    } else if (err.name === 'JsonWebTokenError') {
        statusCode = 401;
        errorMessage = 'Invalid token';
    } else if (err.name === 'TokenExpiredError') {
        statusCode = 401;
        errorMessage = 'Token expired';
    } else if (err.status) {
        statusCode = err.status;
        errorMessage = err.message;
    }

    // Don't expose internal errors in production
    if (config.nodeEnv === 'production' && statusCode === 500) {
        errorMessage = 'Internal Server Error';
    }

    // Send error response
    res.status(statusCode).json({
        error: errorMessage,
        status: statusCode,
        timestamp: new Date().toISOString(),
        ...(config.nodeEnv === 'development' && { stack: err.stack })
    });
};

// 404 handler for unmatched routes
const notFoundHandler = (req, res) => {
    logger.warn('Route not found:', {
        url: req.url,
        method: req.method,
        ip: req.ip
    });

    res.status(404).json({
        error: 'Route not found',
        status: 404,
        timestamp: new Date().toISOString()
    });
};

// Async error wrapper
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

// Rate limiting error handler
const rateLimitErrorHandler = (err, req, res, next) => {
    if (err.type === 'entity.too.large') {
        logger.warn('Request too large:', {
            url: req.url,
            method: req.method,
            ip: req.ip,
            contentLength: req.get('Content-Length')
        });

        return res.status(413).json({
            error: 'Request too large',
            status: 413,
            timestamp: new Date().toISOString()
        });
    }
    next(err);
};

// Webhook signature error handler
const webhookErrorHandler = (err, req, res, next) => {
    if (err.message && err.message.includes('Invalid signature')) {
        logger.warn('Invalid webhook signature:', {
            url: req.url,
            method: req.method,
            ip: req.ip,
            signature: req.headers['x-hub-signature-256']
        });

        return res.status(403).json({
            error: 'Invalid webhook signature',
            status: 403,
            timestamp: new Date().toISOString()
        });
    }
    next(err);
};

module.exports = {
    errorHandler,
    notFoundHandler,
    asyncHandler,
    rateLimitErrorHandler,
    webhookErrorHandler
}; 