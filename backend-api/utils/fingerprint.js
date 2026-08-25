const crypto = require('crypto');

/**
 * Creates a unique device fingerprint for the user based on User-Agent and optionally Accept-Language.
 * This prevents session hijacking via token copying across different browsers.
 * @param {import('express').Request} req
 * @returns {string} SHA-256 hash representing the device fingerprint
 */
const generateFingerprint = (req) => {
    // 1. Get User-Agent
    const userAgent = req.headers['user-agent'] || 'UnknownUserAgent';
    
    // 2. Get Accept-Language (Optional, adds extra uniqueness)
    const acceptLanguage = req.headers['accept-language'] || 'UnknownLanguage';
    
    // We intentionally DO NOT include req.ip here, because mobile users constantly change IP 
    // when switching between Wi-Fi and 4G, which would immediately log them out and frustrate them.
    
    const rawFingerprint = `${userAgent}-${acceptLanguage}`;
    
    return crypto.createHash('sha256').update(rawFingerprint).digest('hex');
};

module.exports = {
    generateFingerprint
};
