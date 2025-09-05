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
const paymentTimeoutScheduler = require('./schedulers/paymentTimeout');

const app = express();
const { metricsMiddleware, getSnapshot } = require('./middlewares/metrics');

// Trust proxy for rate limiting behind load balancers (Render, etc.)
app.set('trust proxy', 1);

// Apply general rate limiting and lightweight metrics
app.use(generalLimiter);
app.use(metricsMiddleware);

// Body parser middleware with raw body capture for signature verification
app.use(bodyParser.json({
    limit: '10mb',
    verify: (req, res, buf) => { req.rawBody = buf; }
}));
app.use(bodyParser.urlencoded({
    extended: true,
    limit: '10mb',
    verify: (req, res, buf) => { req.rawBody = buf; }
}));

// MongoDB Connection with retry logic
const connectDB = async () => {
    try {
        await mongoose.connect(config.database.uri, config.database.options);
        logger.info('################################');
        logger.info('### DATABASE CONNECTION ###');
        logger.info('################################');
        logger.info('✅ [MONGODB CONNECTED]');
        logger.info('  ├── Status: Successfully connected');
        logger.info('  ├── URI: MongoDB Atlas');
        logger.info('  └── Action: Database ready for webhooks');
    } catch (error) {
        logger.error('################################');
        logger.error('### DATABASE CONNECTION ERROR ###');
        logger.error('################################');
        logger.error('❌ [MONGODB ERROR]');
        logger.error('  ├── Type: Connection failed');
        logger.error('  └── Details: Retrying in 5 seconds');
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

// Metrics endpoint (log-based ops, simple snapshot)
app.get('/metrics', healthCheckLimiter, async (req, res) => {
    try {
        const User = require('./models/user');
        const snapshot = await getSnapshot(User);
        res.status(200).json(snapshot);
    } catch (e) {
        logger.error('Metrics endpoint error', { error: e.message });
        res.status(500).json({ error: 'metrics_failed' });
    }
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

// MoMo payment routes (with optional IP allowlist for callbacks)
const ipAllowlist = require('./middlewares/ipAllowlist');
app.use('/momo', ipAllowlist('MOMO_CALLBACK_IPS'), require('./routes/momo'));

// Payment management routes
app.use('/payment', require('./routes/payment'));

// 404 Handler
app.use(notFoundHandler);

// Error Handler (must be last)
app.use(errorHandler);

const PORT = config.server.port;
app.listen(PORT, () => {
    logger.info('################################');
    logger.info('### SERVER STARTUP ###');
    logger.info('################################');
    logger.info(`🚀 [SERVER STARTED]`);
    logger.info(`  ├── Port: ${PORT}`);
    logger.info(`  ├── URL: ${config.service.url}`);
    logger.info(`  ├── Environment: ${config.app.environment}`);
    logger.info(`  ├── Version: ${config.app.version}`);
    logger.info(`  └── Action: Webhook service ready`);
    
    // Log environment variables status
    logger.info(`🔑 [ENVIRONMENT CHECK]`);
    logger.info(`  ├── OpenAI API: ${config.ai.apiKey ? '✅ Configured' : '❌ Missing'}`);
    logger.info(`  ├── SELF_URL: ${config.service.selfUrl ? '✅ Configured' : '❌ Missing'}`);
    logger.info(`  ├── MongoDB: ${config.database.uri ? '✅ Configured' : '❌ Missing'}`);
    logger.info(`  └── Action: Validating configuration`);
    
    // Start schedulers
    logger.info('🕐 [SCHEDULED TASKS]');
    logger.info('  ├── Status: Starting schedulers');
    logger.info('  └── Action: Initializing background services');
    
    dailyResetScheduler.start();
    subscriptionCheckerScheduler.start();
    paymentTimeoutScheduler.start();
    
    logger.info('✅ [SCHEDULERS STARTED]');
    logger.info('  ├── Status: All schedulers active');
    logger.info('  └── Action: Background services running');
    
    // Start self-ping service if SELF_URL is configured
    if (config.service.selfUrl) {
        logger.info(`🔄 [SELF-PING SERVICE]`);
        logger.info(`  ├── Status: Starting self-ping`);
        logger.info(`  ├── URL: ${config.service.selfUrl}`);
        logger.info(`  └── Action: Keeping service alive`);
        
        // Delay self-ping start to allow service to fully initialize
        setTimeout(() => {
            startSelfPing();
        }, 10000); // 10 second delay
    } else {
        logger.warn('⚠️ [SELF-PING DISABLED]');
        logger.warn('  ├── Status: SELF_URL not configured');
        logger.warn('  └── Action: Self-ping disabled');
        logger.info('💡 [SELF-PING SETUP]');
        logger.info('  ├── Tip: Set SELF_URL environment variable');
        logger.info('  └── Action: To enable self-ping service');
    }
});

// Self-ping function to keep service awake
function startSelfPing() {
    const axios = require('axios');
    const pingUrl = `${config.service.selfUrl}/health`;
    
    logger.info(`🔄 [SELF-PING CONFIGURED]`);
    logger.info(`  ├── URL: ${pingUrl}`);
    logger.info(`  ├── Interval: ${config.service.pingInterval} seconds`);
    logger.info(`  └── Action: Service monitoring active`);
    
    let pingCount = 0;
    
    // Send initial ping immediately
    sendPing();
    
    // Then set up interval
    const pingInterval = setInterval(sendPing, config.service.pingInterval * 1000);
    
    async function sendPing() {
        pingCount++;
        const startTime = Date.now();
        
        try {
            logger.info(`🔄 [SELF-PING STARTING]`);
            logger.info(`  ├── Count: #${pingCount}`);
            logger.info(`  └── Action: Checking service health`);
            
            const response = await axios.get(pingUrl, { 
                timeout: config.service.pingTimeout,
                headers: {
                    'User-Agent': 'AnswerBotAI-SelfPing/1.0'
                }
            });
            
            const duration = Date.now() - startTime;
            
            if (response.status === 200) {
                logger.info(`✅ [SELF-PING SUCCESS]`);
                logger.info(`  ├── Count: #${pingCount}`);
                logger.info(`  ├── Status: ${response.status}`);
                logger.info(`  ├── Uptime: ${response.data.uptime}s`);
                logger.info(`  ├── Duration: ${duration}ms`);
                logger.info(`  └── Action: Service healthy`);
            } else {
                logger.warn(`⚠️ [SELF-PING WARNING]`);
                logger.warn(`  ├── Count: #${pingCount}`);
                logger.warn(`  ├── Status: ${response.status}`);
                logger.warn(`  ├── Duration: ${duration}ms`);
                logger.warn(`  └── Action: Service responding but with warning`);
            }
        } catch (error) {
            const duration = Date.now() - startTime;
            logger.error(`❌ [SELF-PING FAILED]`);
            logger.error(`  ├── Count: #${pingCount}`);
            logger.error(`  ├── Error: ${error.message}`);
            logger.error(`  ├── Duration: ${duration}ms`);
            logger.error(`  └── Action: Service health check failed`);
            
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
    logger.info(`🆔 [SELF-PING INTERVAL]`);
    logger.info(`  ├── ID: ${pingInterval}`);
    logger.info(`  └── Action: Monitoring service active`);
    
    // Return the interval ID in case we need to clear it later
    return pingInterval;
}

// Graceful shutdown
process.on('SIGTERM', () => {
    logger.info('################################');
    logger.info('### GRACEFUL SHUTDOWN ###');
    logger.info('################################');
    logger.info('🛑 [SHUTDOWN INITIATED]');
    logger.info('  ├── Signal: SIGTERM received');
    logger.info('  └── Action: Starting graceful shutdown');
    
    dailyResetScheduler.stop();
    subscriptionCheckerScheduler.stop();
    paymentTimeoutScheduler.stop();
    
    logger.info('🔄 [SCHEDULERS STOPPED]');
    logger.info('  ├── Status: All schedulers stopped');
    logger.info('  └── Action: Background services halted');
    
    mongoose.connection.close().then(() => {
        logger.info('✅ [MONGODB CLOSED]');
        logger.info('  ├── Status: Connection closed successfully');
        logger.info('  └── Action: Database connection terminated');
        process.exit(0);
    }).catch((error) => {
        logger.error('❌ [MONGODB CLOSE ERROR]');
        logger.error('  ├── Type: Connection close failed');
        logger.error(`  └── Details: ${error.message}`);
        process.exit(1);
    });
});

process.on('SIGINT', () => {
    logger.info('################################');
    logger.info('### GRACEFUL SHUTDOWN ###');
    logger.info('################################');
    logger.info('🛑 [SHUTDOWN INITIATED]');
    logger.info('  ├── Signal: SIGINT received');
    logger.info('  └── Action: Starting graceful shutdown');
    
    dailyResetScheduler.stop();
    subscriptionCheckerScheduler.stop();
    paymentTimeoutScheduler.stop();
    
    logger.info('🔄 [SCHEDULERS STOPPED]');
    logger.info('  ├── Status: All schedulers stopped');
    logger.info('  └── Action: Background services halted');
    
    mongoose.connection.close().then(() => {
        logger.info('✅ [MONGODB CLOSED]');
        logger.info('  ├── Status: Connection closed successfully');
        logger.info('  └── Action: Database connection terminated');
        process.exit(0);
    }).catch((error) => {
        logger.error('❌ [MONGODB CLOSE ERROR]');
        logger.error('  ├── Type: Connection close failed');
        logger.error(`  └── Details: ${error.message}`);
        process.exit(1);
    });
});
