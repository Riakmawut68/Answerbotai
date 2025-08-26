// Check MTN MoMo RequestToPay status by reference
require('dotenv').config();
const mongoose = require('mongoose');

(async () => {
	const logger = console;
	try {
		const config = require('../config');
		const MomoService = require('../services/momoService');

		const reference = process.env.REF || process.argv[2];
		if (!reference) {
			logger.error('Usage: node scripts/checkMomoStatus.js <reference>');
			process.exit(1);
		}

		// No DB needed, but config may assume connection in some flows
		try {
			await mongoose.connect(config.database.uri, config.database.options);
		} catch (_) {}

		const momo = new MomoService();
		const result = await momo.checkPaymentStatus(reference);
		logger.log(JSON.stringify({ reference, result, env: { baseUrl: momo.config.baseUrl, target: momo.config.targetEnvironment } }, null, 2));

		try { await mongoose.connection.close(); } catch (_) {}
		process.exit(0);
	} catch (err) {
		console.error('Status check error:', err.message);
		try { await mongoose.connection.close(); } catch (_) {}
		process.exit(1);
	}
})();


