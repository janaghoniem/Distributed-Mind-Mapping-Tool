const mongoose = require('mongoose');
const logger = require('../utils/logger');
const DEFAULT_RETRY_MS = 5000;



async function connectDatabase() {
    const uri = process.env.MONGODB_URI;

    try {
        await mongoose.connect(uri, {
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 5000,
        });

        logger.info('MongoDB connected successfully');

        mongoose.connection.on('error', (err) => {
            logger.error('MongoDB error:', err);
        });

        mongoose.connection.on('disconnected', () => {
            logger.warn('MongoDB disconnected');
        });

        return mongoose.connection;
    } catch (error) {
        logger.error('MongoDB connection failed:', error);
        throw error;
    }
}

async function connectWithRetry(uri, options = {}, retryDelay = DEFAULT_RETRY_MS) {
    // Do not throw on initial failure; try repeatedly in background
    async function attempt() {
        try {
            await mongoose.connect(uri, { ...options, useNewUrlParser: true, useUnifiedTopology: true });
            logger.info('MongoDB connected successfully (connectWithRetry)');
        } catch (err) {
            const msg = err && err.message ? err.message : String(err);
            logger.error(`MongoDB connection failed: ${msg}`);
            // If auth error, log hint (driver typically will not auto-retry auth failures)
            if (/auth|authentication/i.test(msg)) {
                logger.error('Authentication failed. Please verify MONGODB_URI credentials and IP whitelist.');
            }
            // schedule retry
            setTimeout(attempt, retryDelay);
        }
    }

    // start attempts but don't await here so server can start
    attempt();
}

module.exports = {
    connectDatabase,
    connectWithRetry,
};