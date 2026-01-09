const getApiUrl = () => {
    let url = process.env.API_URL || 'http://185.2.83.39';
    // Remove trailing slash if present
    url = url.replace(/\/$/, '');
    
    // If it's just the IP/domain, append the standard path
    if (!url.includes('.php')) {
        return `${url}/ints/client/res/data_smscdr.php`;
    }
    return url;
};

export const CONFIG = {
    apiUrl: getApiUrl(),
    sessionCookie: process.env.SESSION_COOKIE,
    botToken: process.env.TELEGRAM_BOT_TOKEN,
    adminId: process.env.ADMIN_ID,
    loginUsername: process.env.LOGIN_USERNAME,
    loginPassword: process.env.LOGIN_PASSWORD,

    pollInterval: parseInt(process.env.POLL_INTERVAL),
    maxMessageAge: parseInt(process.env.MAX_MESSAGE_AGE),
    fetchWindowMinutes: parseInt(process.env.FETCH_WINDOW_MINUTES),
    clockSkewTolerance: parseInt(process.env.CLOCK_SKEW_TOLERANCE),

    cacheRetentionSeconds: parseInt(process.env.CACHE_RETENTION_SECONDS),
    maxCacheSize: parseInt(process.env.MAX_CACHE_SIZE),

    skipExistingOnStart: process.env.SKIP_EXISTING_ON_START === 'true',

    maxRetries: parseInt(process.env.MAX_RETRIES),
    retryDelay: parseInt(process.env.RETRY_DELAY),

    stateFile: process.env.STATE_FILE,

    logLevel: process.env.LOG_LEVEL,
    enableFileLogging: process.env.ENABLE_FILE_LOGGING === 'true',
    logDir: process.env.LOG_DIR
};
