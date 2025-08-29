const config = require('../config');
const { pruneAndCount, getLastNotice, setLastNotice } = require('../utils/metrics');

function getCapsForUser(user) {
    const isPremium = user.subscription && user.subscription.status === 'active' && user.subscription.planType !== 'none';
    const caps = isPremium ? config.perUserLimits.premium : config.perUserLimits.freemium;
    return {
        windowMs: config.perUserLimits.windowMs,
        aiPerHour: caps.aiPerHour,
        graphPerHour: caps.graphPerHour,
        noticeCooldownMs: config.perUserLimits.noticeCooldownMs
    };
}

function checkLimit(user, kind) {
    const { windowMs } = getCapsForUser(user);
    const count = pruneAndCount(user.messengerId, kind, windowMs);
    const cap = kind === 'ai' ? getCapsForUser(user).aiPerHour : getCapsForUser(user).graphPerHour;
    return { count, cap, limited: count >= cap };
}

function shouldNotify(user) {
    const last = getLastNotice(user.messengerId);
    return (Date.now() - last) >= getCapsForUser(user).noticeCooldownMs;
}

function markNotified(user) {
    setLastNotice(user.messengerId, Date.now());
}

module.exports = {
    getCapsForUser,
    checkLimit,
    shouldNotify,
    markNotified
};


