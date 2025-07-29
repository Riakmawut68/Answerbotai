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
  
  logger.info(`Starting self-ping service to: ${pingUrl}`);
  
  // Send initial ping immediately
  sendPing();
  
  // Then set up interval
  setInterval(sendPing, 50000); // Ping every 50 seconds
  
  async function sendPing() {
    try {
      const response = await axios.get(pingUrl, { timeout: 10000 });
      if (response.status === 200) {
        logger.info(`Self-ping successful - Status: ${response.status}, Uptime: ${response.data.uptime}s`);
      } else {
        logger.warn(`Self-ping failed with status: ${response.status}`);
      }
    } catch (error) {
      logger.error(`Self-ping failed: ${error.message}`);
    }
  }
}
