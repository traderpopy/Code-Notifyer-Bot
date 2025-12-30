export const CONFIG = {
    apiUrl: 'http://185.2.83.39/ints/client/res/data_smscdr.php',
    sessionCookie: process.env.SESSION_COOKIE || 'PHPSESSID=89mjqe96d845np2mtd1l1m0cb4',

    botToken: process.env.TELEGRAM_BOT_TOKEN || '7374976678:AAFyP4wcYFOrG3fhbASGxA_5_dOMb46so9I',

    pollInterval: 5000,
    maxMessageAge: 290,
    fetchWindowMinutes: 5,
    clockSkewTolerance: 10,

    cacheRetentionSeconds: 300,
    maxCacheSize: 100,

    skipExistingOnStart: true,

    maxRetries: 3,
    retryDelay: 2000,

    stateFile: './state.json',

    logLevel: 'DEBUG',
    enableFileLogging: false,
    logDir: './logs'
};
