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

        // Use library formatting (e.g. +1 202-555-0100 or +44 20 7123 1234)
        // Removing spaces for compact display if preferred, or keeping them for readability
        // Let's stick to standard international format but maybe strip spaces if previously requested?
        // User asked for parsed.formatInternational().
        const formatted = parsed.formatInternational();

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

/**
 * Mask phone number for display (e.g., +2217XXXXX777)
 * Shows first 4 digits, masks middle with X, shows last 3 digits
 * @param {string} phone - Formatted phone number (with + prefix)
 * @returns {string} Masked phone number
 */
export function maskPhoneNumber(phone) {
    if (!phone) return '';

    // Remove non-digit chars (except +)
    // Actually typically we mask the digits.
    const digits = phone.replace(/\D/g, '');

    // Define visibility
    const visiblePrefix = 4;
    const visibleSuffix = 3;

    // Check for overlap or short numbers
    if (digits.length <= (visiblePrefix + visibleSuffix)) {
        // Very short number, show minimal
        // e.g. 12345 -> 1...5
        if (digits.length <= 2) return phone; // Too short to mask
        return `+${digits.slice(0, 1)}...${digits.slice(-1)}`;
    }

    const start = digits.slice(0, visiblePrefix);
    const end = digits.slice(-visibleSuffix);

    // Calculate middle length
    const middleLength = digits.length - visiblePrefix - visibleSuffix;

    // Ensure we don't mask too much or too little, but logic above guarantees middleLength >= 1
    // Don't cap with Math.min, let it expand
    const masked = 'X'.repeat(Math.max(middleLength, 1));

    return `+${start}${masked}${end}`;
}
