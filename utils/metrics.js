// Simple in-memory per-user metrics for Graph Send API and AI calls
// NOTE: This resets on process restart. Good enough for observability and tuning.

const countersByUser = new Map();

function getUser(userId) {
    if (!countersByUser.has(userId)) {
        countersByUser.set(userId, {
            graph: {
                total: 0,
                text: 0,
                quickReplies: 0,
                buttonTemplate: 0,
                other: 0
            },
            ai: {
                total: 0,
                success: 0,
                failure: 0
            }
            ,
            timestamps: {
                graph: [], // array of ms timestamps
                ai: []     // array of ms timestamps
            },
            lastNoticeAt: 0
        });
    }
    return countersByUser.get(userId);
}

function incGraph(userId, type) {
    const u = getUser(userId);
    u.graph.total += 1;
    if (type && u.graph[type] !== undefined) {
        u.graph[type] += 1;
    } else {
        u.graph.other += 1;
    }
    u.timestamps.graph.push(Date.now());
}

function incAI(userId, { success }) {
    const u = getUser(userId);
    u.ai.total += 1;
    if (success) u.ai.success += 1; else u.ai.failure += 1;
    // AI calls are tracked but not rate-limited; keep timestamps if needed
    u.timestamps.ai.push(Date.now());
}

function getUserSummary(userId) {
    const u = getUser(userId);
    return {
        graph: { ...u.graph },
        ai: { ...u.ai }
    };
}

function pruneAndCount(userId, kind, windowMs) {
    const u = getUser(userId);
    const now = Date.now();
    const arr = kind === 'graph' ? u.timestamps.graph : u.timestamps.ai;
    // prune
    while (arr.length && (now - arr[0]) > windowMs) {
        arr.shift();
    }
    return arr.length;
}

function setLastNotice(userId, whenMs) {
    const u = getUser(userId);
    u.lastNoticeAt = whenMs;
}

function getLastNotice(userId) {
    const u = getUser(userId);
    return u.lastNoticeAt || 0;
}

module.exports = {
    incGraph,
    incAI,
    getUserSummary,
    pruneAndCount,
    setLastNotice,
    getLastNotice
};


