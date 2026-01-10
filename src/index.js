import 'dotenv/config';
import { CONFIG } from './config.js';
import { fetchMessages } from './modules/api.js';
import { extractOtp } from './modules/otp.js';
import { formatPhoneWithFlag } from './modules/phone.js';
import { initTelegram, sendOtpNotification, sendStartupNotification } from './modules/telegram.js';
import { getStats } from './modules/subscribers.js';
import { loadState, saveState, generateMessageId, isMessageProcessed, addMessageToCache, cleanOldCacheEntries } from './modules/state.js';
import * as log from './modules/logger.js';

let state = null;
let isPolling = false;

async function processMessage(message) {
    const otp = extractOtp(message.message);
    if (!otp) {
        return { sent: false, status: 'NO_OTP' };
    }

    // Generate unique ID for deduplication
    const messageId = generateMessageId(message.phone, message.timestamp, otp);

    // Check if already processed
    if (isMessageProcessed(state, messageId)) {
        log.debug('DEDUP', 'Skipping duplicate message', { messageId });
        return { sent: false, status: 'DUPLICATE' };
    }

    const phoneInfo = formatPhoneWithFlag(message.phone);

    const success = await sendOtpNotification({
        otp,
        phone: phoneInfo.formatted,
        flag: phoneInfo.flag,
        countryCode: phoneInfo.countryCode,
        timestamp: message.timestamp,
        rawMessage: message.message
    });

    if (success) {
        log.logOtp(otp, phoneInfo.formatted, phoneInfo.flag, message.timestamp, 'SENT');
        // Add to processed cache
        addMessageToCache(state, messageId);
        return { sent: true, status: 'SENT' };
    }

    log.logOtp(otp, phoneInfo.formatted, phoneInfo.flag, message.timestamp, 'FAILED');
    return { sent: false, status: 'FAILED' };
}

async function handleStartup() {
    log.info('STARTUP', 'Starting OTP Monitor Bot...');

    state = loadState();

    if (!initTelegram()) {
        log.error('STARTUP', 'Failed to initialize Telegram bot');
        process.exit(1);
    }

    const stats = getStats();

    log.info('STARTUP', 'Fetching latest message to set baseline...');
    const messages = await fetchMessages();

    if (messages.length > 0) {
        const newestTimestamp = messages[0].timestamp;
        state.lastSeenTimestamp = newestTimestamp;
        saveState(state);
        log.success('STARTUP', `Baseline set: ${newestTimestamp}`);
        log.info('STARTUP', `Will only send OTPs newer than: ${newestTimestamp}`);
    } else {
        state.lastSeenTimestamp = null;
        saveState(state);
        log.warn('STARTUP', 'No messages found, will send all new OTPs');
    }

    log.logStartup(stats);
}

async function pollForMessages() {
    if (isPolling) {
        log.debug('POLL', 'Skipping poll - previous still running');
        return;
    }

    isPolling = true;

    try {
        log.debug('POLL', 'Fetching messages from API...');
        const messages = await fetchMessages();

        let newCount = 0;
        let newestTimestamp = state.lastSeenTimestamp;

        /*
         * Process messages from oldest to newest to maintain order
         * API returns newest first, so we reverse
         */
        const messagesToProcess = [...messages].reverse();

        for (const message of messagesToProcess) {
            // Skip if older than last seen timestamp
            if (state.lastSeenTimestamp && message.timestamp <= state.lastSeenTimestamp) {
                continue;
            }

            const result = await processMessage(message);
            if (result.sent) {
                newCount++;
            }

            // Track newest timestamp regardless of sent status (to advance pointer)
            if (!newestTimestamp || message.timestamp > newestTimestamp) {
                newestTimestamp = message.timestamp;
            }
        }

        if (newestTimestamp && newestTimestamp !== state.lastSeenTimestamp) {
            state.lastSeenTimestamp = newestTimestamp;
            saveState(state);
        }

        // Clean up old cache entries
        cleanOldCacheEntries(state);
        // Save state periodically to persist cache
        if (newCount > 0) {
            saveState(state);
        }

        log.logApiResponse(messages.length, newCount, messages.length - newCount);
        state.lastChecked = new Date().toISOString();
        saveState(state); // Ensure state is saved at end of poll

    } catch (error) {
        log.error('POLL', 'Polling error', { error: error.message });
    } finally {
        isPolling = false;
    }
}

async function main() {
    await handleStartup();

    log.info('POLL', 'Starting poll loop...');

    setInterval(pollForMessages, CONFIG.pollInterval);
}

main().catch(error => {
    log.error('FATAL', 'Fatal error', { error: error.message });
    process.exit(1);
});
