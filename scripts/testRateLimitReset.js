// This script demonstrates that the per-user rate limit automatically resets
// after the sliding window period (1 hour) without needing an explicit timer.

const limitService = require('../services/limitService');
const { incGraph, pruneAndCount } = require('../utils/metrics');
const config = require('../config');

// --- Test Setup ---
const USER_ID = 'test-user-123';
const RATE_LIMIT = config.perUserLimits.generalGraphPerHour; // 50
const WINDOW_MS = config.perUserLimits.windowMs; // 3,600,000 ms (1 hour)

console.log('--- Rate Limit Sliding Window Test ---');
console.log(`Configured Rate Limit: ${RATE_LIMIT} requests per hour.`);
console.log(`Sliding Window: ${WINDOW_MS / 1000 / 60} minutes.`);

// --- Step 1: Simulate hitting the rate limit ---
console.log(`\nStep 1: Simulating user hitting the rate limit of ${RATE_LIMIT} requests...`);

for (let i = 0; i < RATE_LIMIT; i++) {
    incGraph(USER_ID, 'text');
}

let limitCheck = limitService.checkLimit({ messengerId: USER_ID }, 'graph');
console.log(`User request count is now: ${limitCheck.count}`);
console.log(`Is user blocked? ${limitCheck.limited ? 'Yes' : 'No'}`);

if (!limitCheck.limited) {
    console.error('TEST FAILED: User should be blocked but is not.');
    process.exit(1);
}

console.log('✅ User is correctly blocked.');

// --- Step 2: Simulate the passage of time ---
console.log(`\nStep 2: Simulating the passage of 1 hour and 1 minute...`);

// We will manually manipulate the timestamps to simulate time passing
// This is faster and more reliable than waiting for an actual hour.
const { countersByUser } = require('../utils/metrics'); 
const userMetrics = countersByUser.get(USER_ID);

if (userMetrics) {
    const ONE_HOUR_ONE_MINUTE_AGO = Date.now() - (WINDOW_MS + 60 * 1000);
    // Move all of the user's timestamps to be older than the window
    userMetrics.timestamps.graph = userMetrics.timestamps.graph.map(() => ONE_HOUR_ONE_MINUTE_AGO);
    console.log('Timestamps have been artificially aged.');
}

// --- Step 3: Check if the user is unblocked ---
console.log('\nStep 3: Checking if the user is unblocked after the window has passed...');

// The pruneAndCount function should now clear the old timestamps
limitCheck = limitService.checkLimit({ messengerId: USER_ID }, 'graph');
console.log(`User request count is now: ${limitCheck.count}`);
console.log(`Is user blocked? ${limitCheck.limited ? 'Yes' : 'No'}`);

if (limitCheck.limited) {
    console.error('TEST FAILED: User should be unblocked but is still blocked.');
    process.exit(1);
}

console.log('✅ User is correctly unblocked.');

console.log('\n--- TEST COMPLETE: The sliding window works as expected. ---');
