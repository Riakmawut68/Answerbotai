const winston = require('winston');
const path = require('path');

// Custom format for detailed logging
const detailedFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let logMessage = `[${timestamp}] ${level.toUpperCase()}: ${message}`;
    
    // Add metadata if present
    if (Object.keys(meta).length > 0) {
      logMessage += ` | ${JSON.stringify(meta)}`;
    }
    
    return logMessage;
  })
);

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: detailedFormat,
  transports: [
    // Error log file
    new winston.transports.File({
      filename: path.join(__dirname, '../logs/error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    // Combined log file
    new winston.transports.File({
      filename: path.join(__dirname, '../logs/combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    // Detailed stage tracking log
    new winston.transports.File({
      filename: path.join(__dirname, '../logs/stages.log'),
      level: 'info',
      maxsize: 5242880, // 5MB
      maxFiles: 3
    })
  ]
});

// Console transport for Render logs with enhanced formatting
logger.add(new winston.transports.Console({
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.colorize(),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
      let logMessage = `[${timestamp}] ${level.toUpperCase()}: ${message}`;
      
      // Add metadata for console output
      if (Object.keys(meta).length > 0) {
        logMessage += ` | ${JSON.stringify(meta)}`;
      }
      
      return logMessage;
    })
  )
}));

// Helper methods for stage tracking with clear indicators
logger.stage = (stage, userId, details = {}) => {
  logger.info(`🎯 STAGE TRANSITION`, {
    stage,
    userId,
    timestamp: new Date().toISOString(),
    ...details
  });
};

logger.userAction = (action, userId, details = {}) => {
  logger.info(`👤 USER ACTION`, {
    action,
    userId,
    timestamp: new Date().toISOString(),
    ...details
  });
};

logger.payment = (event, userId, details = {}) => {
  logger.info(`💳 PAYMENT EVENT`, {
    event,
    userId,
    timestamp: new Date().toISOString(),
    ...details
  });
};

logger.ai = (event, userId, details = {}) => {
  logger.info(`🤖 AI SERVICE`, {
    event,
    userId,
    timestamp: new Date().toISOString(),
    ...details
  });
};

// NEW: Clear result indicators
logger.success = (message, userId, details = {}) => {
  logger.info(`✅ SUCCESS: ${message}`, {
    userId,
    timestamp: new Date().toISOString(),
    ...details
  });
};

logger.failure = (message, userId, details = {}) => {
  logger.error(`❌ FAILURE: ${message}`, {
    userId,
    timestamp: new Date().toISOString(),
    ...details
  });
};

logger.warning = (message, userId, details = {}) => {
  logger.warn(`⚠️ WARNING: ${message}`, {
    userId,
    timestamp: new Date().toISOString(),
    ...details
  });
};

logger.info = (message, userId, details = {}) => {
  logger.info(`ℹ️ INFO: ${message}`, {
    userId,
    timestamp: new Date().toISOString(),
    ...details
  });
};

// NEW: Payment flow tracking with clear results
logger.paymentStart = (userId, planType, amount) => {
  logger.info(`🚀 PAYMENT STARTED`, {
    userId,
    planType,
    amount,
    timestamp: new Date().toISOString()
  });
};

logger.paymentSuccess = (userId, reference, amount) => {
  logger.info(`🎉 PAYMENT SUCCESSFUL`, {
    userId,
    reference,
    amount,
    timestamp: new Date().toISOString()
  });
};

logger.paymentFailed = (userId, reason) => {
  logger.error(`💥 PAYMENT FAILED`, {
    userId,
    reason,
    timestamp: new Date().toISOString()
  });
};

logger.paymentCancelled = (userId) => {
  logger.warn(`🚫 PAYMENT CANCELLED`, {
    userId,
    timestamp: new Date().toISOString()
  });
};

// NEW: User journey tracking
logger.userRegistered = (userId) => {
  logger.info(`🆕 NEW USER REGISTERED`, {
    userId,
    timestamp: new Date().toISOString()
  });
};

logger.trialStarted = (userId) => {
  logger.info(`🎯 TRIAL STARTED`, {
    userId,
    timestamp: new Date().toISOString()
  });
};

logger.trialLimitReached = (userId, messagesUsed) => {
  logger.warn(`🛑 TRIAL LIMIT REACHED`, {
    userId,
    messagesUsed,
    timestamp: new Date().toISOString()
  });
};

logger.subscriptionActivated = (userId, planType) => {
  logger.success(`🌟 SUBSCRIPTION ACTIVATED`, {
    userId,
    planType,
    timestamp: new Date().toISOString()
  });
};

module.exports = logger;
