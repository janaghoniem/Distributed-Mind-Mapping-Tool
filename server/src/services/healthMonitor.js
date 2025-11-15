const mongoose = require('mongoose');
const serverConfig = require('../config/server');
const logger = require('../utils/logger');

class HealthMonitor {
    constructor() {
        this.isHealthy = true;
        this.failureCount = 0;
        this.config = serverConfig.healthCheck;
        this.isPrimary = true; // This server starts as primary
        this.maxFailures = 2; // Stop retrying after this many failures
        this.lastCheckTime = 0;
        this.minCheckIntervalMs = 1000; // Prevent too-frequent checks
        this.monitoringInterval = null; // Track the interval so we can stop it
        this.failoverTriggered = false; // Prevent duplicate failover messages

        // Listen to mongoose connection lifecycle to log and react immediately
        mongoose.connection.on('connected', () => {
            logger.info('MongoDB connected (event)');
            this.failureCount = 0; // Reset on successful connect
            if (!this.isHealthy) {
                this.isHealthy = true;
                logger.info('Service recovered (via event)');
            }
        });

        mongoose.connection.on('disconnected', () => {
            this.recordFailure('Database disconnected (event)');
        });

        mongoose.connection.on('error', (err) => {
            // Classify auth vs network errors for clearer logs
            const msg = (err && err.message) ? err.message : String(err);
            logger.warn(`MongoDB connection error (event): ${msg}`);
            if (/auth|authentication/i.test(msg)) {
                // Authentication errors are immediate but still recorded so admin can act
                this.recordFailure(`Authentication error: ${msg}`, { authError: true });
            } else {
                this.recordFailure(`Connection error: ${msg}`);
            }
        });
    }

    startMonitoring() {
        // Delay initial check to allow DB connection to establish
        // Prevents false "Database not connected" warning at startup
        setTimeout(() => {
            this.checkHealth();
        }, 2000);

        this.monitoringInterval = setInterval(() => {
            // Stop checking if failover already triggered
            if (this.failoverTriggered) {
                clearInterval(this.monitoringInterval);
                return;
            }
            this.checkHealth();
        }, this.config.interval);

        logger.info('Health monitoring active');
    }

    async checkHealth() {
        // Throttle checks to avoid spamming
        const now = Date.now();
        if (now - this.lastCheckTime < this.minCheckIntervalMs) {
            return;
        }
        this.lastCheckTime = now;

        try {
            const dbState = mongoose.connection.readyState;
            if (dbState !== 1) {
                this.recordFailure('Database not connected');
                return;
            }

            // Ping database - wrap in try so we can capture specific errors
            await mongoose.connection.db.admin().ping();

            // Reset on success
            this.failureCount = 0;
            if (!this.isHealthy) {
                logger.info('Service recovered');
                this.isHealthy = true;
            }
        } catch (error) {
            // Provide more context for the error
            const msg = error && error.message ? error.message : String(error);
            this.recordFailure(`Ping failed: ${msg}`, { originalError: error });
        }
    }

    recordFailure(reason, meta = {}) {
        // If auth error and admin mistake, mark but avoid aggressive failover until threshold
        const isAuth = !!meta.authError || /auth|authentication/i.test(reason);

        // Don't count more failures after failover triggered
        if (this.failoverTriggered) {
            return;
        }

        this.failureCount++;

        logger.warn(`Health check failed (${this.failureCount}/${this.config.unhealthyThreshold}): ${reason}`);

        // Log extra hint for authentication problems
        if (isAuth) {
            logger.warn('Hint: Authentication failed. Check MONGODB_URI credentials and IP whitelist.');
        }

        // Stop retrying if we've exceeded max failures
        if (this.failureCount >= this.maxFailures) {
            if (this.isHealthy) {
                this.isHealthy = false;
                logger.error('SERVICE UNHEALTHY - Max retries exceeded. Triggering failover simulation');
                this.failoverTriggered = true;
                this.simulateFailover();
            }
            return;
        }

        // Trigger failover at threshold (before max)
        if (this.failureCount >= this.config.unhealthyThreshold) {
            this.triggerFailover();
        }
    }

    triggerFailover() {
        if (this.isHealthy && !this.failoverTriggered) {
            this.isHealthy = false;
            this.failoverTriggered = true;
            logger.error('SERVICE UNHEALTHY - Triggering failover simulation');

            // Simulate failover logic
            this.simulateFailover();
        }
    }

    simulateFailover() {
        logger.info('Failover Simulation Started:');
        logger.info('   1. Marking primary as unhealthy');
        logger.info('   2. [SIMULATION] Promoting standby server to primary');
        logger.info('   3. [SIMULATION] Updating load balancer configuration');
        logger.info('   4. [SIMULATION] Notifying clients to reconnect');
        logger.info('   5. [SIMULATION] Redirecting traffic to new primary');

        this.isPrimary = false;

        setTimeout(() => {
            logger.info('Failover simulation complete - standby is now primary');
        }, 2000);
    }

    getStatus() {
        return {
            healthy: this.isHealthy,
            isPrimary: this.isPrimary,
            database: mongoose.connection.readyState === 1,
            failureCount: this.failureCount,
            timestamp: new Date()
        };
    }
}

module.exports = HealthMonitor;