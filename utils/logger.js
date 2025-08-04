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

// Helper methods for stage tracking
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

module.exports = logger;
