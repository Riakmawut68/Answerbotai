const logger = require('../utils/logger');

function parseList(envVal) {
    if (!envVal) return [];
    return envVal.split(',').map(s => s.trim()).filter(Boolean);
}

function ipAllowlist(envVarName) {
    const allowed = new Set(parseList(process.env[envVarName]));
    return (req, res, next) => {
        if (allowed.size === 0) {
            // No list configured: allow but log once per process boot
            if (!ipAllowlist._warned) {
                logger.warn(`IP allowlist disabled; set ${envVarName} to enable restrictions`);
                ipAllowlist._warned = true;
            }
            return next();
        }
        const ip = req.ip || req.connection?.remoteAddress || '';
        if (allowed.has(ip)) return next();
        logger.warn('Blocked request by IP allowlist', { ip, envVarName });
        return res.status(403).json({ error: 'forbidden' });
    };
}

module.exports = ipAllowlist;


