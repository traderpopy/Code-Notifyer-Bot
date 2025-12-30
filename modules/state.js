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
    lastChecked: null
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
    return state.recentMessageIds.includes(messageId);
}

/**
 * Add message ID to cache
 * @param {Object} state - Current state (mutated)
 * @param {string} messageId - Message ID to add
 */
export function addMessageToCache(state, messageId) {
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
    if (!state.lastProcessedTimestamp || timestamp > state.lastProcessedTimestamp) {
        state.lastProcessedTimestamp = timestamp;
    }
}
