const winston = require('winston');
const path = require('path');
const moment = require('moment-timezone');

// Get Juba timezone from config
const getJubaTimestamp = () => {
  return moment().tz('Africa/Juba').format('YYYY-MM-DD HH:mm:ss');
};

// Custom format for detailed logging with Juba timezone
const detailedFormat = winston.format.combine(
  winston.format.timestamp({ format: getJubaTimestamp }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const jubaTime = getJubaTimestamp();
    let logMessage = `[${jubaTime}] ${level.toUpperCase()}: ${message}`;
    
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

// Console transport for Render logs with enhanced formatting (Juba timezone)
logger.add(new winston.transports.Console({
  format: winston.format.combine(
    winston.format.timestamp({ format: getJubaTimestamp }),
    winston.format.colorize(),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
      const jubaTime = getJubaTimestamp();
      let logMessage = `[${jubaTime}] ${level.toUpperCase()}: ${message}`;
      
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
    timestamp: getJubaTimestamp(),
    ...details
  });
};

logger.userAction = (action, userId, details = {}) => {
  logger.info(`👤 USER ACTION`, {
    action,
    userId,
    timestamp: getJubaTimestamp(),
    ...details
  });
};

logger.payment = (event, userId, details = {}) => {
  logger.info(`💳 PAYMENT EVENT`, {
    event,
    userId,
    timestamp: getJubaTimestamp(),
    ...details
  });
};

logger.ai = (event, userId, details = {}) => {
  logger.info(`🤖 AI SERVICE`, {
    event,
    userId,
    timestamp: getJubaTimestamp(),
    ...details
  });
};

// NEW: Clear result indicators
logger.success = (message, userId, details = {}) => {
  logger.info(`✅ SUCCESS: ${message}`, {
    userId,
    timestamp: getJubaTimestamp(),
    ...details
  });
};

logger.failure = (message, userId, details = {}) => {
  logger.error(`❌ FAILURE: ${message}`, {
    userId,
    timestamp: getJubaTimestamp(),
    ...details
  });
};

logger.warning = (message, userId, details = {}) => {
  logger.warn(`⚠️ WARNING: ${message}`, {
    userId,
    timestamp: getJubaTimestamp(),
    ...details
  });
};

logger.infoMessage = (message, userId, details = {}) => {
  logger.info(`ℹ️ INFO: ${message}`, {
    userId,
    timestamp: getJubaTimestamp(),
    ...details
  });
};

// NEW: Payment flow tracking with clear results
logger.paymentStart = (userId, planType, amount) => {
  logger.info(`🚀 PAYMENT STARTED`, {
    userId,
    planType,
    amount,
    timestamp: getJubaTimestamp()
  });
};

logger.paymentSuccess = (userId, reference, amount) => {
  logger.info(`🎉 PAYMENT SUCCESSFUL`, {
    userId,
    reference,
    amount,
    timestamp: getJubaTimestamp()
  });
};

logger.paymentFailed = (userId, reason) => {
  logger.error(`💥 PAYMENT FAILED`, {
    userId,
    reason,
    timestamp: getJubaTimestamp()
  });
};

logger.paymentCancelled = (userId) => {
  logger.warn(`🚫 PAYMENT CANCELLED`, {
    userId,
    timestamp: getJubaTimestamp()
  });
};

// NEW: User journey tracking
logger.userRegistered = (userId) => {
  logger.info(`🆕 NEW USER REGISTERED`, {
    userId,
    timestamp: getJubaTimestamp()
  });
};

logger.trialStarted = (userId) => {
  logger.info(`🎯 TRIAL STARTED`, {
    userId,
    timestamp: getJubaTimestamp()
  });
};

logger.trialLimitReached = (userId, messagesUsed) => {
  logger.warn(`🛑 TRIAL LIMIT REACHED`, {
    userId,
    messagesUsed,
    timestamp: getJubaTimestamp()
  });
};

logger.subscriptionActivated = (userId, planType) => {
  logger.success(`🌟 SUBSCRIPTION ACTIVATED`, {
    userId,
    planType,
    timestamp: getJubaTimestamp()
  });
};

module.exports = logger;
