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
    console.log(`🔍 ${output}`);
    writeToFile(output);
}

export function info(category, message, data = null) {
    if (!shouldLog('INFO')) return;
    const output = formatLog('INFO', category, message, data);
    console.log(`ℹ️  ${output}`);
    writeToFile(output);
}

export function warn(category, message, data = null) {
    if (!shouldLog('WARN')) return;
    const output = formatLog('WARN', category, message, data);
    console.warn(`⚠️  ${output}`);
    writeToFile(output);
}

export function error(category, message, data = null) {
    if (!shouldLog('ERROR')) return;
    const output = formatLog('ERROR', category, message, data);
    console.error(`❌ ${output}`);
    writeToFile(output);
}

export function success(category, message, data = null) {
    const output = formatLog('INFO', category, message, data);
    console.log(`✅ ${output}`);
    writeToFile(output);
}

export function logOtp(otp, phone, flag, timestamp, status) {
    const output = `
╔════════════════════════════════════════════════════════════╗
║  OTP ${status === 'SENT' ? '📤 SENT' : status === 'SKIPPED' ? '⏭️  SKIPPED' : '❌ FAILED'}
╠════════════════════════════════════════════════════════════╣
║  Code:    ${otp}
║  Number:  ${flag} ${phone}
║  Time:    ${timestamp}
║  Status:  ${status}
╚════════════════════════════════════════════════════════════╝`;

    console.log(output);
    writeToFile(`[${getTimestamp()}] [OTP] ${status} | Code: ${otp} | Phone: ${phone} | Time: ${timestamp}`);
}

export function logApiResponse(totalMessages, newMessages, skippedMessages) {
    const output = `
┌──────────────────────────────────────┐
│  API Poll Results                    │
├──────────────────────────────────────┤
│  Total fetched:  ${String(totalMessages).padEnd(18)}│
│  New OTPs:       ${String(newMessages).padEnd(18)}│
│  Skipped:        ${String(skippedMessages).padEnd(18)}│
└──────────────────────────────────────┘`;

    console.log(output);
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
