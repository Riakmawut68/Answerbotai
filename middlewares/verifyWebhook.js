const crypto = require('crypto');
const logger = require('../utils/logger');

function verifyWebhook(req, res, next) {
  if (req.method === 'GET') {
    // Handle the webhook verification challenge
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode && token) {
      if (mode === 'subscribe' && token === process.env.VERIFY_TOKEN) {
        logger.info('Webhook verified');
        return res.status(200).send(challenge);
      }
      return res.sendStatus(403);
    }
  } else if (req.method === 'POST') {
    // Verify request signature
    const signature = req.headers['x-hub-signature-256'];
    if (!signature) {
      logger.error('No signature found in webhook request');
      return res.sendStatus(403);
    }

    const elements = signature.split('=');
    const signatureHash = elements[1];
    
    const rawBody = req.rawBody || Buffer.from(JSON.stringify(req.body));
    const expectedHash = crypto
      .createHmac('sha256', process.env.FB_APP_SECRET)
      .update(rawBody)
      .digest('hex');

    if (signatureHash !== expectedHash) {
      logger.error('Invalid signature in webhook request');
      return res.sendStatus(403);
    }
  }
  
  next();
}

module.exports = verifyWebhook;
