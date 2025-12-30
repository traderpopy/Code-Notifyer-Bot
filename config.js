export const CONFIG = {
    apiUrl: process.env.API_URL || 'http://185.2.83.39/ints/client/res/data_smscdr.php',
    sessionCookie: process.env.SESSION_COOKIE,
    botToken: process.env.TELEGRAM_BOT_TOKEN,

    pollInterval: 1000,
    maxMessageAge: 290,
    fetchWindowMinutes: 5,
    clockSkewTolerance: 10,

    cacheRetentionSeconds: 300,
    maxCacheSize: 100,

    skipExistingOnStart: true,

    maxRetries: 3,
    retryDelay: 2000,

    stateFile: './state.json',

    logLevel: process.env.LOG_LEVEL || 'INFO',
    enableFileLogging: false,
    logDir: './logs'
};
