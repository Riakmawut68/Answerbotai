// Initiate a real MTN MoMo payment for a specific user/number
require('dotenv').config();
const mongoose = require('mongoose');

(async () => {
	const logger = console;
	try {
		const config = require('../config');
		const User = require('../models/user');
		const MomoService = require('../services/momoService');

		await mongoose.connect(config.database.uri, config.database.options);

		// Use provided messengerId via env or default to known tester
		const messengerId = process.env.TEST_MESSENGER_ID || '9713039132131329';
		const phone = process.env.TEST_MSISDN || '0922233738';
		const planType = 'monthly';

		let user = await User.findOne({ messengerId });
		if (!user) {
			user = new User({ messengerId });
		}

		user.consentTimestamp = user.consentTimestamp || new Date();
		user.lastSelectedPlanType = planType;
		user.paymentMobileNumber = phone;
		user.stage = 'awaiting_phone_for_payment';
		await user.save();

		logger.log('Prepared user:', { messengerId, phone, planType, environment: config.momo.environment, baseUrl: config.momo.baseUrl });

		const momoService = new MomoService();
		const result = await momoService.initiatePayment(user, planType);
		logger.log('Initiate result:', result);

		await mongoose.connection.close();
		process.exit(0);
	} catch (err) {
		console.error('Initiation error:', err.message);
		try { await mongoose.connection.close(); } catch (_) {}
		process.exit(1);
	}
})();


