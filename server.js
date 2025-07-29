require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const logger = require('./utils/logger');

const app = express();

// Middleware
app.use(bodyParser.json());

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
.then(() => logger.info('MongoDB Connected'))
.catch(err => logger.error('MongoDB Connection Error:', err));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'Answer Bot AI',
    uptime: process.uptime()
  });
});

// Test ping endpoint (for manual testing)
app.get('/ping', (req, res) => {
  logger.info('🔔 Manual ping received from external request');
  res.status(200).json({ 
    message: 'Ping received!',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Routes
app.use('/webhook', require('./routes/webhook'));

// Error Handler
app.use((err, req, res, next) => {
  logger.error('Unhandled Error:', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  logger.info(`🚀 Server started successfully on port ${PORT}`);
  logger.info(`🌐 Service URL: https://answerbotai.onrender.com`);
  logger.info(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
  
  // Log environment variables status
  logger.info(`🔑 OpenAI API Key: ${process.env.OPENAI_API_KEY ? '✅ Configured' : '❌ Missing'}`);
  logger.info(`📱 SELF_URL: ${process.env.SELF_URL ? '✅ Configured' : '❌ Missing'}`);
  
  // Start self-ping service if SELF_URL is configured
  if (process.env.SELF_URL) {
    logger.info(`🔄 Starting self-ping service to: ${process.env.SELF_URL}`);
    startSelfPing();
  } else {
    logger.warn('⚠️ SELF_URL not configured - self-ping disabled');
    logger.info('💡 To enable self-ping, set SELF_URL environment variable to your service URL');
  }
});

// Self-ping function to keep service awake
function startSelfPing() {
  const axios = require('axios');
  const pingUrl = `${process.env.SELF_URL}/health`;
  
  logger.info(`🔄 Self-ping service configured for: ${pingUrl}`);
  logger.info(`⏰ Ping interval: 50 seconds`);
  
  let pingCount = 0;
  
  // Send initial ping immediately
  sendPing();
  
  // Then set up interval
  const pingInterval = setInterval(sendPing, 50000); // Ping every 50 seconds
  
  async function sendPing() {
    pingCount++;
    const startTime = Date.now();
    
    try {
      logger.info(`🔄 Self-ping #${pingCount} starting...`);
      
      const response = await axios.get(pingUrl, { 
        timeout: 10000,
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
        logger.error(`   Response data: ${JSON.stringify(error.response.data)}`);
      }
    }
  }
  
  // Log the interval ID for debugging
  logger.info(`🆔 Self-ping interval ID: ${pingInterval}`);
  
  // Return the interval ID in case we need to clear it later
  return pingInterval;
}
