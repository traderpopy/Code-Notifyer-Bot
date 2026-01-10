const getApiUrl = () => {
    let url = process.env.API_URL || 'http://185.2.83.39';
    // Remove trailing slash if present
    url = url.replace(/\/$/, '');

    // If it's just the IP/domain, append the standard path
    if (!url.includes('.php')) {
        return `${url}/ints/client/res/data_smscdr.php`;
    }
    return url;
    return url;
};

// Helper: Validate required env vars
function validateRequiredEnv(keys) {
    const missing = keys.filter(key => !process.env[key]);
    if (missing.length > 0) {
        throw new Error(`❌ Missing required environment variables: ${missing.join(', ')}`);
    }
}

// Validate critical keys before building CONFIG
validateRequiredEnv(['SESSION_COOKIE', 'TELEGRAM_BOT_TOKEN', 'ADMIN_ID', 'LOGIN_USERNAME', 'LOGIN_PASSWORD']);

export const CONFIG = {
    apiUrl: getApiUrl(),
    sessionCookie: process.env.SESSION_COOKIE,
    botToken: process.env.TELEGRAM_BOT_TOKEN,
    adminId: process.env.ADMIN_ID,
    loginUsername: process.env.LOGIN_USERNAME,
    loginPassword: process.env.LOGIN_PASSWORD,

    // Safe integer parsing with defaults
    pollInterval: parseInt(process.env.POLL_INTERVAL, 10) || 5000,
    maxMessageAge: parseInt(process.env.MAX_MESSAGE_AGE, 10) || 300,
    fetchWindowMinutes: parseInt(process.env.FETCH_WINDOW_MINUTES, 10) || 1440,
    clockSkewTolerance: parseInt(process.env.CLOCK_SKEW_TOLERANCE, 10) || 60,

    cacheRetentionSeconds: parseInt(process.env.CACHE_RETENTION_SECONDS, 10) || 3600,
    maxCacheSize: parseInt(process.env.MAX_CACHE_SIZE, 10) || 1000,

    skipExistingOnStart: process.env.SKIP_EXISTING_ON_START === 'true',

    maxRetries: parseInt(process.env.MAX_RETRIES, 10) || 3,
    retryDelay: parseInt(process.env.RETRY_DELAY, 10) || 2000,

    // New config for timeouts
    requestTimeout: parseInt(process.env.REQUEST_TIMEOUT, 10) || 30000,

    stateFile: process.env.STATE_FILE || './state.json',

    logLevel: process.env.LOG_LEVEL || 'INFO',
    enableFileLogging: process.env.ENABLE_FILE_LOGGING === 'true',
    logDir: process.env.LOG_DIR || './logs'
};
