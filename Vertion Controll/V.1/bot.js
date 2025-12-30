import { CONFIG } from './config.js';
import { fetchMessages } from './modules/api.js';
import { extractOtp } from './modules/otp.js';
import { formatPhoneWithFlag } from './modules/phone.js';
import { initTelegram, sendOtpNotification, sendStartupNotification } from './modules/telegram.js';
import { getStats } from './modules/subscribers.js';
import { loadState, saveState } from './modules/state.js';
import * as log from './modules/logger.js';

let state = null;

async function processMessage(message) {
    const otp = extractOtp(message.message);
    if (!otp) {
        return { sent: false, status: 'NO_OTP' };
    }

    const phoneInfo = formatPhoneWithFlag(message.phone);

    const success = await sendOtpNotification({
        otp,
        phone: phoneInfo.formatted,
        flag: phoneInfo.flag,
        timestamp: message.timestamp,
        rawMessage: message.message
    });

    if (success) {
        log.logOtp(otp, phoneInfo.formatted, phoneInfo.flag, message.timestamp, 'SENT');
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
    try {
        log.debug('POLL', 'Fetching messages from API...');
        const messages = await fetchMessages();

        let newCount = 0;
        let newestTimestamp = state.lastSeenTimestamp;

        for (const message of messages) {
            if (state.lastSeenTimestamp && message.timestamp <= state.lastSeenTimestamp) {
                continue;
            }

            const result = await processMessage(message);
            if (result.sent) {
                newCount++;
                if (!newestTimestamp || message.timestamp > newestTimestamp) {
                    newestTimestamp = message.timestamp;
                }
            }
        }

        if (newestTimestamp && newestTimestamp !== state.lastSeenTimestamp) {
            state.lastSeenTimestamp = newestTimestamp;
            saveState(state);
        }

        log.logApiResponse(messages.length, newCount, messages.length - newCount);
        state.lastChecked = new Date().toISOString();
        saveState(state);

    } catch (error) {
        log.error('POLL', 'Polling error', { error: error.message });
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
