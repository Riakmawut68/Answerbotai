// List active subscribers and their expiry dates
require('dotenv').config();
const mongoose = require('mongoose');

(async () => {
	try {
		const config = require('../config');
		const User = require('../models/user');

		await mongoose.connect(config.database.uri, config.database.options);

		const now = new Date();
		const activeUsers = await User.find({ 'subscription.status': 'active' })
			.select('messengerId mobileNumber paymentMobileNumber subscription stage')
			.lean();

		if (activeUsers.length === 0) {
			console.log('No active subscribers found.');
			await mongoose.connection.close();
			process.exit(0);
		}

		const result = activeUsers.map(u => ({
			messengerId: u.messengerId,
			stage: u.stage,
			planType: u.subscription?.planType || 'unknown',
			startDate: u.subscription?.startDate || null,
			expiryDate: u.subscription?.expiryDate || null,
			status: u.subscription?.status || 'unknown',
			daysRemaining: u.subscription?.expiryDate
				? Math.max(0, Math.ceil((new Date(u.subscription.expiryDate) - now) / (1000 * 60 * 60 * 24)))
				: null,
		}));

		console.log(JSON.stringify({ count: result.length, subscribers: result }, null, 2));

		await mongoose.connection.close();
		process.exit(0);
	} catch (error) {
		console.error('Error listing active subscriptions:', error.message);
		try { await mongoose.connection.close(); } catch (_) {}
		process.exit(1);
	}
})();


