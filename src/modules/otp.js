// ═══════════════════════════════════════════════════════════════════════════
// OTP EXTRACTION MODULE
// Extracts OTP codes from SMS messages using regex patterns
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Common OTP patterns found in SMS messages
 * Ordered by specificity (most specific first)
 */
const OTP_PATTERNS = [
    // "code 123456" or "code: 123456"
    /\bcode[:\s]+(\d{4,8})\b/i,

    // "OTP 123456" or "OTP: 123456"
    /\bOTP[:\s]+(\d{4,8})\b/i,

    // "verification code 123456"
    /verification\s*code[:\s]+(\d{4,8})\b/i,

    // "your code is 123456"
    /your\s+code\s+is[:\s]+(\d{4,8})\b/i,

    // "PIN: 123456"
    /\bPIN[:\s]+(\d{4,8})\b/i,

    // Explicit OTP indicators
    /(?:\b(?:otp|one[-\s]?time|verification|code|pin)[:\s]*)(\d{4,8})/i,

    // Telegram specific: "Telegram code 123456" or "Telegram: 123456" or "Telegram 123456"
    /Telegram(?:[:\s]+code)?[:\s]+(\d{4,8})\b/i,

    // WhatsApp specific: "WhatsApp code 123456" or "WhatsApp: 123456" or "WhatsApp 123456"
    /WhatsApp(?:[:\s]+code)?[:\s]+(\d{4,8})\b/i,

    // Generic 4-8 digit code at start of message
    /^(\d{4,8})\s+is\s+your/i,

    // Fallback: Standalone number not surrounded by alphanumeric chars (avoid phone numbers)
    /(?<![A-Za-z0-9])(\d{4,8})(?![A-Za-z0-9])/
];

/**
 * Extract OTP code from SMS message
 * @param {string} message - Raw SMS message content
 * @returns {string|null} Extracted OTP code or null if not found
 */
export function extractOtp(message) {
    if (!message || typeof message !== 'string') {
        return null;
    }

    // Normalize message: remove newlines, extra spaces
    const normalizedMessage = message.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim();

    // Try each pattern until we find a match
    for (const pattern of OTP_PATTERNS) {
        const match = normalizedMessage.match(pattern);
        if (match && match[1]) {
            return match[1];
        }
    }

    return null;
}

/**
 * Check if message likely contains an OTP
 * Useful for quick filtering before full extraction
 * @param {string} message - Raw SMS message content
 * @returns {boolean} True if message likely contains OTP
 */
export function hasOtpIndicators(message) {
    // Ensure strict type check
    if (!message || typeof message !== 'string') return false;

    const indicators = [
        /\bcode\b/i,
        /\bOTP\b/i,
        /\bverification\b/i,
        /\bPIN\b/i,
        /\bpassword\b/i,
        /\bTelegram\b/i,
        /\bWhatsApp\b/i,
        /\d{4,8}/
    ];

    return indicators.some(pattern => pattern.test(message));
}
