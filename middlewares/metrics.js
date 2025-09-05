const logger = require('../utils/logger');

// Simple in-memory metrics for RPS over a short rolling window
// Not a replacement for real monitoring; fits log-based ops

const WINDOW_SECONDS = 60;
const buckets = new Array(WINDOW_SECONDS).fill(0);
let lastTick = Math.floor(Date.now() / 1000);

function tick() {
    const now = Math.floor(Date.now() / 1000);
    if (now !== lastTick) {
        const diff = Math.min(WINDOW_SECONDS, Math.max(0, now - lastTick));
        for (let i = 1; i <= diff; i++) {
            buckets[(lastTick + i) % WINDOW_SECONDS] = 0;
        }
        lastTick = now;
    }
}

function recordRequest() {
    tick();
    buckets[lastTick % WINDOW_SECONDS] += 1;
}

function getRps() {
    tick();
    const total = buckets.reduce((a, b) => a + b, 0);
    const avg = total / WINDOW_SECONDS;
    const current = buckets[lastTick % WINDOW_SECONDS];
    return { current, avg, windowSeconds: WINDOW_SECONDS };
}

function metricsMiddleware(req, res, next) {
    recordRequest();
    next();
}

async function getSnapshot(UserModel) {
    const totalUsers = await UserModel.countDocuments({});
    const subscribedWeekly = await UserModel.countDocuments({ 'subscription.status': 'active', 'subscription.planType': 'weekly' });
    const subscribedMonthly = await UserModel.countDocuments({ 'subscription.status': 'active', 'subscription.planType': 'monthly' });
    const rps = getRps();

    const snapshot = {
        users: {
            total: totalUsers,
            subscribed: {
                weekly: subscribedWeekly,
                monthly: subscribedMonthly
            }
        },
        rps
    };

    logger.info('📈 Metrics snapshot', snapshot);
    return snapshot;
}

module.exports = { metricsMiddleware, getSnapshot };


