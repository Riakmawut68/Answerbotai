// Simulate subscription expiry and notify the user (frontend + backend)
require('dotenv').config();
const mongoose = require('mongoose');

(async () => {
	const logger = console; // simple console for script output
	try {
		const config = require('../config');
		const User = require('../models/user');
		const messengerService = require('../services/messengerService');
		const subscriptionChecker = require('../schedulers/subscriptionChecker');

		await mongoose.connect(config.database.uri, config.database.options);

		// Find one active subscriber
		let user = await User.findOne({ 'subscription.status': 'active' });
		if (!user) {
			logger.log('No active subscribers found. Aborting.');
			await mongoose.connection.close();
			process.exit(0);
		}

		logger.log('Before:', JSON.stringify({
			messengerId: user.messengerId,
			stage: user.stage,
			subscription: user.subscription
		}, null, 2));

		// Force expiry (set expiryDate in the past, keep status active so checker updates it)
		user.subscription.expiryDate = new Date(Date.now() - 60 * 1000);
		user.subscription.status = 'active';
		user.stage = 'subscribed';
		await user.save();

		// Run expiry checker (backend procedure)
		await subscriptionChecker.manualCheck();

		// Reload to confirm updates
		user = await User.findById(user._id);
		logger.log('After:', JSON.stringify({
			messengerId: user.messengerId,
			stage: user.stage,
			subscription: user.subscription
		}, null, 2));

		// Frontend message (what the user sees)
		await messengerService.sendText(
			user.messengerId,
			'Your subscription has expired. Please renew to continue using the service.'
		);
		// Send subscription buttons
		await messengerService.sendButtonTemplate(
			user.messengerId,
			'Select your preferred plan:',
			[
				{ type: 'postback', title: `Weekly Plan ${config.momo.displayAmounts.weekly.toLocaleString()} ${config.momo.displayCurrency}`, payload: 'SUBSCRIBE_WEEKLY' },
				{ type: 'postback', title: `Monthly Plan ${config.momo.displayAmounts.monthly.toLocaleString()} ${config.momo.displayCurrency}`, payload: 'SUBSCRIBE_MONTHLY' }
			]
		);

		logger.log('Notification sent to user:', user.messengerId);

		await mongoose.connection.close();
		process.exit(0);
	} catch (error) {
		logger.error('Error during simulation:', error.message);
		try { await mongoose.connection.close(); } catch (_) {}
		process.exit(1);
	}
})();


