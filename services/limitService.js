const config = require('../config');
const { pruneAndCount, getLastNotice, setLastNotice } = require('../utils/metrics');

function getCapsForUser() {
    return {
        windowMs: config.perUserLimits.windowMs,
        graphPerHour: config.perUserLimits.generalGraphPerHour,
        noticeCooldownMs: config.perUserLimits.noticeCooldownMs
    };
}

function checkLimit(user, kind) {
    const { windowMs, graphPerHour } = getCapsForUser();
    const count = pruneAndCount(user.messengerId, kind, windowMs);
    const cap = kind === 'graph' ? graphPerHour : Number.MAX_SAFE_INTEGER; // AI unlimited
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


