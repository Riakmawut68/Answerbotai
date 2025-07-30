require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');

// Import centralized configuration
const config = require('./config');
const logger = require('./utils/logger');

// Import middleware
const { generalLimiter, webhookLimiter, healthCheckLimiter } = require('./middlewares/rateLimit');
const { errorHandler, notFoundHandler } = require('./middlewares/errorHandler');

// Import schedulers
const dailyResetScheduler = require('./schedulers/dailyReset');
const subscriptionCheckerScheduler = require('./schedulers/subscriptionChecker');

const app = express();

// Apply general rate limiting
app.use(generalLimiter);

// Body parser middleware
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

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

// Health check endpoint with rate limiting
app.get('/health', healthCheckLimiter, (req, res) => {
    res.status(200).json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        service: 'Answer Bot AI',
        uptime: process.uptime(),
        version: config.app.version,
        environment: config.app.environment
    });
});

// Test ping endpoint (for manual testing)
app.get('/ping', healthCheckLimiter, (req, res) => {
    logger.info('🔔 Manual ping received from external request');
    res.status(200).json({ 
        message: 'Ping received!',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: config.app.version
    });
});

// Routes with specific rate limiting
app.use('/webhook', webhookLimiter, require('./routes/webhook'));

// 404 Handler
app.use(notFoundHandler);

// Error Handler (must be last)
app.use(errorHandler);

const PORT = config.server.port;
app.listen(PORT, () => {
    logger.info(`🚀 Server started successfully on port ${PORT}`);
    logger.info(`🌐 Service URL: ${config.service.url}`);
    logger.info(`🔧 Environment: ${config.app.environment}`);
    logger.info(`📦 Version: ${config.app.version}`);
    
    // Log environment variables status
    logger.info(`🔑 OpenAI API Key: ${config.ai.apiKey ? '✅ Configured' : '❌ Missing'}`);
    logger.info(`📱 SELF_URL: ${config.service.selfUrl ? '✅ Configured' : '❌ Missing'}`);
    logger.info(`🗄️ MongoDB: ${config.database.uri ? '✅ Configured' : '❌ Missing'}`);
    
    // Start schedulers
    logger.info('🕐 Starting scheduled tasks...');
    dailyResetScheduler.start();
    subscriptionCheckerScheduler.start();
    logger.info('✅ Scheduled tasks started successfully');
    
    // Start self-ping service if SELF_URL is configured
    if (config.service.selfUrl) {
        logger.info(`🔄 Starting self-ping service to: ${config.service.selfUrl}`);
        // Delay self-ping start to allow service to fully initialize
        setTimeout(() => {
            startSelfPing();
        }, 10000); // 10 second delay
    } else {
        logger.warn('⚠️ SELF_URL not configured - self-ping disabled');
        logger.info('💡 To enable self-ping, set SELF_URL environment variable to your service URL');
    }
});

// Self-ping function to keep service awake
function startSelfPing() {
    const axios = require('axios');
    const pingUrl = `${config.service.selfUrl}/health`;
    
    logger.info(`🔄 Self-ping service configured for: ${pingUrl}`);
    logger.info(`⏰ Ping interval: ${config.service.pingInterval} seconds`);
    
    let pingCount = 0;
    
    // Send initial ping immediately
    sendPing();
    
    // Then set up interval
    const pingInterval = setInterval(sendPing, config.service.pingInterval * 1000);
    
    async function sendPing() {
        pingCount++;
        const startTime = Date.now();
        
        try {
            logger.info(`🔄 Self-ping #${pingCount} starting...`);
            
            const response = await axios.get(pingUrl, { 
                timeout: config.service.pingTimeout,
                headers: {
                    'User-Agent': 'AnswerBotAI-SelfPing/1.0'
                }
            });
            
            const duration = Date.now() - startTime;
            
            if (response.status === 200) {
                logger.info(`✅ Self-ping #${pingCount} successful - Status: ${response.status}, Uptime: ${response.data.uptime}s, Duration: ${duration}ms`);
            } else {
                logger.warn(`⚠️ Self-ping #${pingCount} failed with status: ${response.status}, Duration: ${duration}ms`);
            }
        } catch (error) {
            const duration = Date.now() - startTime;
            logger.error(`❌ Self-ping #${pingCount} failed: ${error.message}, Duration: ${duration}ms`);
            
            // Log more details for debugging
            if (error.response) {
                logger.error(`   Response status: ${error.response.status}`);
                
                // Truncate large response data to prevent log flooding
                let responseData = error.response.data;
                if (typeof responseData === 'string' && responseData.length > 500) {
                    responseData = responseData.substring(0, 500) + '... [truncated]';
                }
                logger.error(`   Response data: ${JSON.stringify(responseData)}`);
            }
        }
    }
    
    // Log the interval ID for debugging
    logger.info(`🆔 Self-ping interval ID: ${pingInterval}`);
    
    // Return the interval ID in case we need to clear it later
    return pingInterval;
}

// Graceful shutdown
process.on('SIGTERM', () => {
    logger.info('🛑 SIGTERM received, shutting down gracefully...');
    dailyResetScheduler.stop();
    subscriptionCheckerScheduler.stop();
    mongoose.connection.close(() => {
        logger.info('✅ MongoDB connection closed');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    logger.info('🛑 SIGINT received, shutting down gracefully...');
    dailyResetScheduler.stop();
    subscriptionCheckerScheduler.stop();
    mongoose.connection.close(() => {
        logger.info('✅ MongoDB connection closed');
        process.exit(0);
    });
});
