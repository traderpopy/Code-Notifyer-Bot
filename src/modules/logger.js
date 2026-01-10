import { appendFileSync, existsSync, mkdirSync } from 'fs';
import { CONFIG } from '../config.js';

const LOG_LEVELS = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3
};

function getTimestamp() {
    return new Date().toISOString();
}

function formatLog(level, category, message, data = null) {
    let output = `[${getTimestamp()}] [${level}] [${category}] ${message}`;
    if (data) {
        output += `\n${JSON.stringify(data, null, 2)}`;
    }
    return output;
}

function shouldLog(level) {
    const configLevel = LOG_LEVELS[CONFIG.logLevel] || LOG_LEVELS.INFO;
    return LOG_LEVELS[level] >= configLevel;
}

function writeToFile(content) {
    if (!CONFIG.enableFileLogging) return;

    try {
        if (!existsSync(CONFIG.logDir)) {
            mkdirSync(CONFIG.logDir, { recursive: true });
        }

        const date = new Date().toISOString().split('T')[0];
        const logFile = `${CONFIG.logDir}/${date}.log`;

        appendFileSync(logFile, content + '\n', 'utf8');
    } catch (error) {
        console.error('Failed to write log:', error.message);
    }
}

export function debug(category, message, data = null) {
    if (!shouldLog('DEBUG')) return;
    const output = formatLog('DEBUG', category, message, data);
    console.log(`[DEBUG] ${output}`);
    writeToFile(output);
}

export function info(category, message, data = null) {
    if (!shouldLog('INFO')) return;
    const output = formatLog('INFO', category, message, data);
    console.log(`[INFO] ${output}`);
    writeToFile(output);
}

export function warn(category, message, data = null) {
    if (!shouldLog('WARN')) return;
    const output = formatLog('WARN', category, message, data);
    console.warn(`[WARN] ${output}`);
    writeToFile(output);
}

export function error(category, message, data = null) {
    if (!shouldLog('ERROR')) return;
    const output = formatLog('ERROR', category, message, data);
    console.error(`[ERROR] ${output}`);
    writeToFile(output);
}

export function success(category, message, data = null) {
    if (!shouldLog('INFO')) return;
    const output = formatLog('INFO', category, message, data);
    console.log(`[SUCCESS] ${output}`);
    writeToFile(output);
}

export function logOtp(otp, phone, flag, timestamp, status) {
    if (!shouldLog('INFO')) return;

    // Improved masking logic
    // For short codes (< 8 chars), reveal only 1st char: 1*****
    // For longer codes, reveal first 2 chars: 12******
    let maskedOtp;
    if (otp.length < 8) {
        maskedOtp = otp.substring(0, 1) + '*'.repeat(otp.length - 1);
    } else {
        maskedOtp = otp.substring(0, 2) + '*'.repeat(otp.length - 2);
    }

    // Safety fallback for empty/very short strings
    if (otp.length === 0) maskedOtp = '';

    const output = `
╔════════════════════════════════════════════════════════════╗
║  OTP ${status === 'SENT' ? 'SENT' : status === 'SKIPPED' ? 'SKIPPED' : 'FAILED'}
╠════════════════════════════════════════════════════════════╣
║  Code:    ${maskedOtp.padEnd(20)}
║  Number:  ${(flag + ' ' + phone).padEnd(20)}
║  Time:    ${timestamp}
║  Status:  ${status}
╚════════════════════════════════════════════════════════════╝`;

    console.log(output);
    // Log MASKED OTP to file for security compliance (removing plaintext log risk)
    writeToFile(`[${getTimestamp()}] [OTP] ${status} | Code: ${maskedOtp} | Phone: ${phone} | Time: ${timestamp}`);
}

export function logApiResponse(totalMessages, newMessages, skippedMessages) {
    if (!shouldLog('INFO')) return;

    // Concise single-line output to prevent terminal flooding
    // Only log if something interesting happened (new messages) or if in DEBUG mode
    // Otherwise, just log a "pulse" every now and then? 
    // For now, let's just make it a clean single line.

    const timestamp = new Date().toLocaleTimeString();

    if (newMessages > 0) {
        console.log(`[${timestamp}] [API] Fetched: ${totalMessages} | New: ${newMessages} | Skipped: ${skippedMessages}`);
    } else {
        // If no new messages, stick to a muted info log or skip if you want total silence
        console.log(`[${timestamp}] [API] Fetched: ${totalMessages} | New: 0 | Skipped: ${skippedMessages}`);
    }

    writeToFile(`[${getTimestamp()}] [API] Total: ${totalMessages}, New: ${newMessages}, Skipped: ${skippedMessages}`);
}

export function logStartup(stats) {
    const output = `
╔════════════════════════════════════════════════════════════╗
║  🤖 OTP MONITOR BOT STARTED                                ║
╠════════════════════════════════════════════════════════════╣
║  Time:           ${new Date().toISOString().padEnd(40)}║
║  Poll Interval:  ${String(CONFIG.pollInterval / 1000 + 's').padEnd(40)}║
║  Max OTP Age:    ${String(CONFIG.maxMessageAge + 's').padEnd(40)}║
║  Users:          ${String(stats.users).padEnd(40)}║
║  Groups:         ${String(stats.groups).padEnd(40)}║
║  Log Level:      ${String(CONFIG.logLevel).padEnd(40)}║
║  File Logging:   ${String(CONFIG.enableFileLogging ? 'ON' : 'OFF').padEnd(40)}║
╚════════════════════════════════════════════════════════════╝`;

    console.log(output);
    writeToFile(`[${getTimestamp()}] [STARTUP] Users: ${stats.users}, Groups: ${stats.groups}`);
}
