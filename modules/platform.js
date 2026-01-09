// ═══════════════════════════════════════════════════════════════════════════
// PLATFORM DETECTION MODULE
// Detects OTP source platform (Telegram, Facebook, WhatsApp) from message content
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Platform configurations with detection patterns
 */
export const PLATFORMS = {
    telegram: {
        icon: '✈️',
        name: 'Telegram',
        short: 'TG',
        keywords: [
            'telegram',
            'telegram code',
            'login code',
            't.me/login',
            'tg://login'
        ],
        codePatterns: [
            /Telegram\s+code\s+(\d{5,6})/i,
            /login\s+code[:\s]+(\d{5,6})/i,
            /verification\s+code[:\s]+(\d{5,6})/i,
        ]
    },
    facebook: {
        icon: '📘',
        name: 'Facebook',
        short: 'FB',
        keywords: [
            'facebook',
            'meta',
            'fb-',
            'fb code',
            'facebook code'
        ],
        codePatterns: [
            /FB-(\d{5,8})/i,
            /facebook\s+code[:\s]+(\d{5,8})/i,
            /confirmation\s+code[:\s]+(\d{5,6})/i,
        ]
    },
    whatsapp: {
        icon: '📱',
        name: 'WhatsApp',
        short: 'WA',
        keywords: [
            'whatsapp',
            'whats app',
            'wa.me'
        ],
        codePatterns: [
            /whatsapp[:\s]+(\d{3})-(\d{3})/i,
            /(\d{3})-(\d{3}).*whatsapp/i,
            /whatsapp\s+code[:\s]+(\d{6})/i,
        ]
    },
    unknown: {
        icon: '❓',
        name: 'Others',
        short: 'Others',
        keywords: [],
        codePatterns: []
    }
};

/**
 * Detect platform from message content
 * @param {string} message - Raw SMS/message content
 * @returns {string} Platform key: 'telegram', 'facebook', 'whatsapp', or 'unknown'
 */
export function detectPlatform(message) {
    if (!message || typeof message !== 'string') {
        return 'unknown';
    }

    const lowerMessage = message.toLowerCase();

    // Check WhatsApp first (since FB can send WA codes)
    if (PLATFORMS.whatsapp.keywords.some(kw => lowerMessage.includes(kw.toLowerCase()))) {
        return 'whatsapp';
    }

    // Check Telegram
    if (PLATFORMS.telegram.keywords.some(kw => lowerMessage.includes(kw.toLowerCase()))) {
        return 'telegram';
    }

    // Check Facebook
    if (PLATFORMS.facebook.keywords.some(kw => lowerMessage.includes(kw.toLowerCase()))) {
        return 'facebook';
    }

    return 'unknown';
}

/**
 * Get platform info by key
 * @param {string} platformKey - Platform key
 * @returns {Object} { icon, name, short }
 */
export function getPlatformInfo(platformKey) {
    return PLATFORMS[platformKey] || PLATFORMS.unknown;
}

/**
 * Check if platform is known (not 'unknown')
 * @param {string} platformKey - Platform key
 * @returns {boolean}
 */
export function isKnownPlatform(platformKey) {
    return platformKey !== 'unknown' && PLATFORMS[platformKey] !== undefined;
}
