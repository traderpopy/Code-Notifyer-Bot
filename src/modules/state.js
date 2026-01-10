// ═══════════════════════════════════════════════════════════════════════════
// STATE MANAGEMENT MODULE
// Handles persistent state for duplicate prevention and restart recovery
// ═══════════════════════════════════════════════════════════════════════════

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { CONFIG } from '../config.js';

/**
 * Default state structure
 */
const DEFAULT_STATE = {
    botStartTime: null,
    lastProcessedTimestamp: null,
    recentMessageIds: [],
    lastChecked: null,
    footerText: '⚡ DEV',
    footerLink: 'https://t.me/Cryptoistaken',
    btnNumberText: '♻️ Number',
    btnNumberUrl: 'https://t.me/number_panel_kst',
    btnBackupText: '‼️ Backup',
    btnBackupUrl: 'https://t.me/tg_account_method'
};

/**
 * Load state from file or return fresh state
 * @returns {Object} State object
 */
export function loadState() {
    try {
        if (existsSync(CONFIG.stateFile)) {
            const data = readFileSync(CONFIG.stateFile, 'utf8');
            const state = JSON.parse(data);
            console.log('📂 Loaded existing state from', CONFIG.stateFile);

            // Merge with default state to ensure new fields exist
            return { ...DEFAULT_STATE, ...state };
        }
    } catch (error) {
        console.warn('⚠️ Failed to load state file, starting fresh:', error.message);
    }

    console.log('🆕 Creating new state');
    return { ...DEFAULT_STATE };
}

/**
 * Save state to file
 * @param {Object} state - State object to save
 */
export function saveState(state) {
    try {
        writeFileSync(CONFIG.stateFile, JSON.stringify(state, null, 2), 'utf8');
    } catch (error) {
        console.error('❌ Failed to save state:', error.message);
    }
}

/**
 * Generate unique message ID for deduplication
 * Format: ${number}_${timestamp}_${otpCode}
 * @param {string} number - Phone number
 * @param {string} timestamp - Message timestamp
 * @param {string} otp - OTP code
 * @returns {string} Unique message ID
 */
export function generateMessageId(number, timestamp, otp) {
    return `${number}_${timestamp}_${otp}`;
}

/**
 * Check if message ID already exists in cache
 * @param {Object} state - Current state
 * @param {string} messageId - Message ID to check
 * @returns {boolean} True if already processed
 */
export function isMessageProcessed(state, messageId) {
    // Ensure array exists
    if (!Array.isArray(state.recentMessageIds)) {
        state.recentMessageIds = [];
    }
    return state.recentMessageIds.includes(messageId);
}

/**
 * Add message ID to cache
 * @param {Object} state - Current state (mutated)
 * @param {string} messageId - Message ID to add
 */
export function addMessageToCache(state, messageId) {
    if (!Array.isArray(state.recentMessageIds)) {
        state.recentMessageIds = [];
    }

    state.recentMessageIds.push(messageId);

    // Enforce max cache size
    if (state.recentMessageIds.length > CONFIG.maxCacheSize) {
        state.recentMessageIds = state.recentMessageIds.slice(-CONFIG.maxCacheSize);
    }
}

/**
 * Clean old message IDs from cache (older than retention period)
 * @param {Object} state - Current state (mutated)
 */
export function cleanOldCacheEntries(state) {
    if (!Array.isArray(state.recentMessageIds)) return;

    const now = new Date();
    const cutoffTime = new Date(now.getTime() - CONFIG.cacheRetentionSeconds * 1000);

    state.recentMessageIds = state.recentMessageIds.filter(id => {
        // Extract timestamp from ID format: number_timestamp_otp
        const parts = id.split('_');
        if (parts.length >= 2) {
            const timestamp = parts[1];
            const messageTime = new Date(timestamp);
            return messageTime > cutoffTime;
        }
        return false;
    });
}

/**
 * Update last processed timestamp
 * @param {Object} state - Current state (mutated)
 * @param {string} timestamp - New timestamp
 */
export function updateLastTimestamp(state, timestamp) {
    const newTime = new Date(timestamp).getTime();
    const lastTime = state.lastProcessedTimestamp ? new Date(state.lastProcessedTimestamp).getTime() : 0;

    if (!isNaN(newTime) && newTime > lastTime) {
        state.lastProcessedTimestamp = timestamp;
    }
}

/**
 * Get current footer settings
 * @returns {Object} {text, link}
 */
export function getFooterSettings() {
    const state = loadState();
    return {
        text: state.footerText || DEFAULT_STATE.footerText,
        link: state.footerLink || DEFAULT_STATE.footerLink
    };
}

/**
 * Update footer settings
 * @param {string} text - New footer text (optional)
 * @param {string} link - New footer link (optional)
 */
export function updateFooterSettings(text, link) {
    const state = loadState();

    if (text) state.footerText = text;
    if (link) state.footerLink = link;

    saveState(state);
    return {
        text: state.footerText,
        link: state.footerLink
    };
}

/**
 * Get current button settings
 * @returns {Object} {numberText, numberUrl, backupText, backupUrl}
 */
export function getButtonSettings() {
    const state = loadState();
    return {
        numberText: state.btnNumberText || DEFAULT_STATE.btnNumberText,
        numberUrl: state.btnNumberUrl || DEFAULT_STATE.btnNumberUrl,
        backupText: state.btnBackupText || DEFAULT_STATE.btnBackupText,
        backupUrl: state.btnBackupUrl || DEFAULT_STATE.btnBackupUrl
    };
}

/**
 * Update button settings
 * @param {Object} settings - {numberText, numberUrl, backupText, backupUrl}
 */
export function updateButtonSettings(settings) {
    const state = loadState();

    if (settings.numberText) state.btnNumberText = settings.numberText;
    if (settings.numberUrl) state.btnNumberUrl = settings.numberUrl;
    if (settings.backupText) state.btnBackupText = settings.backupText;
    if (settings.backupUrl) state.btnBackupUrl = settings.backupUrl;

    saveState(state);
    return getButtonSettings();
}
