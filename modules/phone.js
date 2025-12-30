// ═══════════════════════════════════════════════════════════════════════════
// PHONE NUMBER FORMATTING MODULE
// Uses libphonenumber-js for automatic country detection and flag emojis
// ═══════════════════════════════════════════════════════════════════════════

import { parsePhoneNumberFromString } from 'libphonenumber-js';

/**
 * Convert ISO country code to flag emoji
 * Uses Unicode regional indicator symbols
 * @param {string} countryCode - ISO 3166-1 alpha-2 country code (e.g., 'US', 'BD')
 * @returns {string} Flag emoji (e.g., '🇺🇸', '🇧🇩')
 */
function countryCodeToFlag(countryCode) {
    if (!countryCode || countryCode.length !== 2) {
        return '🌐'; // Globe for unknown
    }

    // Convert country code to regional indicator symbols
    // 'A' = 65, Regional Indicator A = 0x1F1E6 (127462)
    const OFFSET = 127397; // 0x1F1E6 - 65
    const chars = countryCode.toUpperCase().split('');

    return chars.map(char => String.fromCodePoint(char.charCodeAt(0) + OFFSET)).join('');
}

/**
 * Format phone number with country flag
 * Automatically detects country using libphonenumber-js
 * @param {string} phoneNumber - Raw phone number (e.g., '593985987705')
 * @returns {Object} { formatted: string, flag: string, countryCode: string }
 */
export function formatPhoneWithFlag(phoneNumber) {
    try {
        // Clean the number - remove any non-digit characters
        const cleanNumber = phoneNumber.replace(/\D/g, '');

        // Parse phone number (try with + prefix for international format)
        let parsed = parsePhoneNumberFromString(`+${cleanNumber}`);

        if (!parsed) {
            // Fallback: return with globe emoji
            return {
                formatted: `+${cleanNumber}`,
                flag: '🌐',
                countryCode: null
            };
        }

        const countryCode = parsed.country;
        const flag = countryCodeToFlag(countryCode);
        const formatted = '+' + cleanNumber;

        return {
            formatted,
            flag,
            countryCode
        };

    } catch (error) {
        console.warn('⚠️ Phone parsing error:', error.message);
        return {
            formatted: `+${phoneNumber.replace(/\D/g, '')}`,
            flag: '🌐',
            countryCode: null
        };
    }
}
