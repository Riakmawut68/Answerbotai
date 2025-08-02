// Minimal test for MTN MoMo sandbox payment integration (no DB)
require('dotenv').config();
const MomoService = require('./services/momoService');

(async () => {
  try {
    // 1. Initialize MomoService in sandbox mode
    process.env.MOMO_ENVIRONMENT = 'sandbox';
    const momoService = new MomoService();

    // 2. Create test user object (mock, no DB)
    const testUser = {
      messengerId: 'test123',
      paymentMobileNumber: '256782181481',
      stage: 'awaiting_payment',
      subscription: { plan: 'none', status: 'none' },
      save: async () => {}, // dummy save
    };

    // 3. Initiate payment of 100 EUR for a "test" plan
    momoService.calculatePlanAmount = () => 100;
    momoService.currency = 'EUR';
    let paymentResult;
    try {
      paymentResult = await momoService.initiatePayment(testUser, 'test');
      console.log('[PAYMENT] Status: OK');
      console.log('[PAYMENT] Reference:', paymentResult.reference);
      console.log('[PAYMENT] Details: Payment initiated successfully.');
    } catch (err) {
      console.log('[PAYMENT] Status: ERROR');
      console.log('[PAYMENT] Reference:', err.reference || 'N/A');
      console.log('[PAYMENT] Details:', err.message);
      process.exit(1);
    }

    // 5. If successful, verify payment status after 5 seconds
    if (paymentResult && paymentResult.reference) {
      await new Promise((resolve) => setTimeout(resolve, 5000));
      try {
        const status = await momoService.verifyPayment(paymentResult.reference);
        console.log('[VERIFICATION] Status:', status.success ? 'OK' : 'ERROR');
        console.log('[VERIFICATION] Reference:', paymentResult.reference);
        console.log('[VERIFICATION] Details:', status.success ? `Payment status: ${status.status}` : `Payment failed or pending: ${status.status}`);
      } catch (err) {
        console.log('[VERIFICATION] Status: ERROR');
        console.log('[VERIFICATION] Reference:', paymentResult.reference);
        console.log('[VERIFICATION] Details:', err.message);
      }
    }
  } catch (e) {
    console.log('[TEST ERROR]', e.message);
    process.exit(1);
  }
})();
