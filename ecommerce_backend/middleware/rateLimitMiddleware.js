import rateLimit from 'express-rate-limit';
import redisClient from '../config/redis.js';

class HybridStore {
    constructor(prefix, windowMs) {
        this.prefix = prefix;
        this.windowMs = windowMs;
        
        // RAM Storage: key -> { count, resetTime }
        this.ramStore = new Map();
        
        // Track Redis connection status
        this.wasRedisConnected = redisClient.isReady;
        
        // Run periodic connection check loop
        this.initConnectionMonitor();
    }

    // Required for express-rate-limit Store
    init(options) {
        this.windowMs = options.windowMs;
    }

    /**
     * Increment access hits for a key.
     * @param {string} key 
     * @returns {Promise<{ totalHits: number, resetTime: Date }>}
     */
    async increment(key) {
        const fullKey = `${this.prefix}${key}`;
        const now = Date.now();

        if (redisClient.isReady) {
            try {
                // 1. Increment hit count in Redis
                const hits = await redisClient.incrBy(fullKey, 1);

                // 2. Set TTL if it is the first hit
                if (hits === 1) {
                    await redisClient.expire(fullKey, Math.ceil(this.windowMs / 1000));
                }

                // 3. Get remaining TTL to calculate accurate resetTime
                const ttl = await redisClient.ttl(fullKey);
                const resetTime = new Date(now + (ttl > 0 ? ttl * 1000 : this.windowMs));

                return {
                    totalHits: hits,
                    resetTime
                };
            } catch (err) {
                console.error(`❌ [Rate Limit] Lỗi thao tác Redis trên key ${fullKey}, tự động chuyển sang RAM:`, err);
                return this.incrementRam(fullKey, now);
            }
        } else {
            // Fallback sang RAM
            return this.incrementRam(fullKey, now);
        }
    }

    /**
     * Decrement access hits for a key.
     * @param {string} key 
     */
    async decrement(key) {
        const fullKey = `${this.prefix}${key}`;
        if (redisClient.isReady) {
            try {
                await redisClient.decr(fullKey);
            } catch (err) {
                this.decrementRam(fullKey);
            }
        } else {
            this.decrementRam(fullKey);
        }
    }

    /**
     * Reset access hits for a key.
     * @param {string} key 
     */
    async resetKey(key) {
        const fullKey = `${this.prefix}${key}`;
        this.ramStore.delete(fullKey);
        if (redisClient.isReady) {
            try {
                await redisClient.del(fullKey);
            } catch (err) {
                // Ignore error
            }
        }
    }

    // --- RAM memory auxiliary functions ---

    incrementRam(fullKey, now) {
        // Periodically cleanup expired RAM keys
        this.cleanExpiredRamKeys(now);

        let record = this.ramStore.get(fullKey);
        if (!record || record.resetTime <= now) {
            record = {
                count: 1,
                resetTime: now + this.windowMs
            };
        } else {
            record.count += 1;
        }

        this.ramStore.set(fullKey, record);

        return {
            totalHits: record.count,
            resetTime: new Date(record.resetTime)
        };
    }

    decrementRam(fullKey) {
        const record = this.ramStore.get(fullKey);
        if (record && record.count > 0) {
            record.count -= 1;
            this.ramStore.set(fullKey, record);
        }
    }

    cleanExpiredRamKeys(now) {
        for (const [key, record] of this.ramStore.entries()) {
            if (record.resetTime <= now) {
                this.ramStore.delete(key);
            }
        }
    }

    // --- Connection monitoring and data synchronization mechanism ---

    initConnectionMonitor() {
        // Run background loop (check connect) every 5 seconds
        setInterval(async () => {
            const isConnected = redisClient.isReady;
            if (isConnected && !this.wasRedisConnected) {
                console.log(`🔄 [Rate Limit] Redis hoạt động trở lại! Đồng bộ dữ liệu rate limit lưu tạm từ RAM lên Redis (Store: ${this.prefix})...`);
                await this.syncRamToRedis();
                this.wasRedisConnected = true;
            } else if (!isConnected && this.wasRedisConnected) {
                console.log(`⚠ [Rate Limit] Mất kết nối tới Redis! Chuyển store ${this.prefix} sang lưu trữ RAM dự phòng.`);
                this.wasRedisConnected = false;
            }
        }, 5000);

        // Listen to ready event to sync immediately upon successful reconnection
        redisClient.on('ready', async () => {
            if (!this.wasRedisConnected) {
                console.log(`🔄 [Rate Limit] Redis sự kiện 'ready' được kích hoạt! Tiến hành đồng bộ dữ liệu RAM lên Redis cho store ${this.prefix}...`);
                await this.syncRamToRedis();
                this.wasRedisConnected = true;
            }
        });
    }

    async syncRamToRedis() {
        if (this.ramStore.size === 0) {
            console.log(`✔ [Rate Limit] Không có dữ liệu rate limit nào trong RAM cần đồng bộ (Store: ${this.prefix}).`);
            return;
        }

        const now = Date.now();
        let successCount = 0;

        for (const [fullKey, record] of this.ramStore.entries()) {
            const remainingMs = record.resetTime - now;
            if (remainingMs <= 0) {
                this.ramStore.delete(fullKey);
                continue;
            }

            const remainingSec = Math.ceil(remainingMs / 1000);
            try {
                // Accumulate RAM count to Redis
                await redisClient.incrBy(fullKey, record.count);
                
                // Sync TTL
                const currentTtl = await redisClient.ttl(fullKey);
                let newTtl = remainingSec;
                if (currentTtl > 0) {
                    newTtl = Math.max(currentTtl, remainingSec);
                }
                await redisClient.expire(fullKey, newTtl);
                successCount++;
            } catch (err) {
                console.error(`❌ [Rate Limit] Lỗi khi đồng bộ key ${fullKey} lên Redis:`, err);
            }
        }

        this.ramStore.clear();
        console.log(`✔ [Rate Limit] Đã đồng bộ thành công ${successCount} key(s) từ RAM lên Redis (Store: ${this.prefix}).`);
    }
}

// Initialize separate stores for exporting and monitoring/syncing externally if needed
// Local default: Global = 100 req/min, Sensitive = 20 req/min to avoid blocking during dev or VM
const globalMax = parseInt(process.env.RATE_LIMIT_GLOBAL_MAX) || 100;
const sensitiveMax = parseInt(process.env.RATE_LIMIT_SENSITIVE_MAX) || 20;

export const globalLimiterStore = new HybridStore('rl-global:', 1 * 60 * 1000);
export const sensitiveLimiterStore = new HybridStore('rl-sensitive:', 1 * 60 * 1000);

// Initialize rate limiters
export const globalLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: globalMax,
    message: 'Bạn đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau 1 phút.',
    standardHeaders: true,
    legacyHeaders: false,
    store: globalLimiterStore,
    handler: (req, res, next, options) => {
        res.status(options.statusCode).json({
            success: false,
            message: options.message
        });
    }
});

export const sensitiveLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: sensitiveMax,
    message: 'Bạn đã thực hiện thao tác quá nhiều lần. Vui lòng thử lại sau 1 phút.',
    standardHeaders: true,
    legacyHeaders: false,
    store: sensitiveLimiterStore,
    handler: (req, res, next, options) => {
        res.status(options.statusCode).json({
            success: false,
            message: options.message
        });
    }
});
