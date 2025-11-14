const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };
const configuredLevel = (process.env.LOG_LEVEL || 'info').toLowerCase();
const currentLevelValue = LEVELS[configuredLevel] ?? LEVELS.info;

function shouldLog(level) {
    return (LEVELS[level] ?? 2) <= currentLevelValue;
}

function timestamp() {
    return new Date().toISOString();
}

const logger = {
    error(...args) {
        if (shouldLog('error')) console.error(`[ERROR] ${timestamp()} -`, ...args);
    },
    warn(...args) {
        if (shouldLog('warn')) console.warn(`[WARN]  ${timestamp()} -`, ...args);
    },
    info(...args) {
        if (shouldLog('info')) console.log(`[INFO]  ${timestamp()} -`, ...args);
    },
    debug(...args) {
        if (shouldLog('debug')) console.debug(`[DEBUG] ${timestamp()} -`, ...args);
    },
    // stream.write for morgan or other middleware expecting a writable stream
    stream: {
        write: (message = '') => {
            const msg = message.toString().trim();
            if (msg) logger.info(msg);
        },
    },
};

module.exports = logger;
