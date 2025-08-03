const express = require('express');
const mongoose = require('mongoose');
const config = require('./config');
const logger = require('./utils/logger');
const messengerController = require('./controllers/messengerController');
const momoController = require('./controllers/momoController');

const app = express();

// Trust proxy for rate limiting behind load balancers
app.set('trust proxy', 1);

// Body parser middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// MongoDB Connection with retry logic
const connectDB = async () => {
    try {
        await mongoose.connect(config.database.uri, config.database.options);
        logger.info('✅ MongoDB Connected Successfully');
    } catch (error) {
        logger.error('❌ MongoDB Connection Error:', error);
        // Retry connection after 5 seconds
        setTimeout(connectDB, 5000);
    }
};

connectDB();

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        service: 'Answer Bot AI',
        uptime: process.uptime(),
        version: config.app.version,
        environment: config.app.environment
    });
});

// Root endpoint
app.get('/', (req, res) => {
    res.send('Answer Bot AI is running.');
});

// Facebook Messenger webhook routes
app.get('/webhook', messengerController.verify);
app.post('/webhook', messengerController.handleEvent);

// MoMo payment callback route
app.post('/momo/callback', momoController.handlePaymentCallback);

// MoMo service health check
app.get('/momo/health', momoController.healthCheck);

// MoMo service diagnostics
app.get('/momo/diagnose', momoController.diagnose);

// 404 Handler
app.use((req, res) => {
    res.status(404).json({ 
        error: 'Not Found',
        message: 'The requested resource was not found',
        timestamp: new Date().toISOString()
    });
});

// Error Handler (must be last)
app.use((error, req, res, next) => {
    logger.error('Unhandled error:', error);
    res.status(500).json({ 
        error: 'Internal Server Error',
        message: 'An unexpected error occurred',
        timestamp: new Date().toISOString()
    });
});

module.exports = app; 