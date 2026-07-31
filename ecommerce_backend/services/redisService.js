import redisClient from '../config/redis.js';

/**
 * Get data from Redis Cache
 * @param {string} key Storage key in Redis
 * @returns {object|null} Parsed data or null if not exists
 */
export const getCache = async (key) => {
    try {
        if (!redisClient.isReady) return null;
        
        const cachedData = await redisClient.get(key);
        if (cachedData) {
            return JSON.parse(cachedData);
        }
        return null;
    } catch (error) {
        console.error(`❌ Lỗi khi lấy cache cho key ${key}:`, error);
        return null; // Return null so system proceeds to Database instead of Crashing
    }
};

/**
 * Save data to Redis Cache with TTL
 * @param {string} key Storage key
 * @param {any} data Data to save (will be stringified)
 * @param {number} ttl Time to live (seconds) - Default 600s (10 mins)
 */
export const setCache = async (key, data, ttl = 600) => {
    try {
        if (!redisClient.isReady) return;
        
        await redisClient.setEx(key, ttl, JSON.stringify(data));
    } catch (error) {
        console.error(`❌ Lỗi khi lưu cache cho key ${key}:`, error);
    }
};

/**
 * Delete a specific Cache
 * @param {string} key Key to delete
 */
export const deleteCache = async (key) => {
    try {
        if (!redisClient.isReady) return;
        
        await redisClient.del(key);
    } catch (error) {
        console.error(`❌ Lỗi khi xóa cache cho key ${key}:`, error);
    }
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Acquire a Mutex Lock
 * @param {string} lockKey Lock key
 * @param {number} ttl Lock TTL (seconds) - in case process dies without releasing flag
 * @returns {boolean} true if flag acquired, false if flag is owned
 */
export const acquireLock = async (lockKey, ttl = 5) => {
    try {
        if (!redisClient.isReady) return true; // Avoid hanging if Redis dies
        const result = await redisClient.set(lockKey, 'locked', { NX: true, EX: ttl });
        return result === 'OK';
    } catch (error) {
        return true; // Safe fallback bypass
    }
};

/**
 * Release a Mutex Lock
 */
export const releaseLock = async (lockKey) => {
    try {
        if (!redisClient.isReady) return;
        await redisClient.del(lockKey);
    } catch (error) {}
};

/**
 * Super Wrapper function: Automate Check Cache -> Call DB -> Save Cache flow
 * @param {string} key Storage key
 * @param {number} ttl Time to live (seconds)
 * @param {Function} fetcher Async function calling DB on Cache miss
 * @returns {any|null} Data (from Cache or DB)
 */
export const getOrSetCache = async (key, ttl, fetcher) => {
    try {
        // Step 1: Check Cache
        const cachedData = await getCache(key);
        if (cachedData) {
            return cachedData;
        }

        // Step 2: No Cache -> Try to acquire Lock
        const lockKey = `lock:${key}`;
        const isLocked = await acquireLock(lockKey);

        if (isLocked) {
            // LOCK ACQUIRED -> Go to DB
            try {
                const freshData = await fetcher();
                if (freshData) {
                    await setCache(key, freshData, ttl);
                }
                return freshData;
            } finally {
                // Release flag whether DB succeeds or fails
                await releaseLock(lockKey);
            }
        } else {
            // LOCK NOT ACQUIRED -> Wait
            let retryCount = 0;
            const maxRetries = 20; // 20 * 50ms = max 1s wait
            
            while (retryCount < maxRetries) {
                await sleep(50);
                const retryData = await getCache(key);
                if (retryData) {
                    return retryData;
                }
                retryCount++;
            }
            
            // After 1s if the other process hasn't finished -> Force call DB as a workaround
            console.warn(`⏳ Timeout đợi Lock cho key ${key}, tự động Fallback gọi DB...`);
            return await fetcher();
        }
    } catch (error) {
        // If Redis process entirely fails, still attempt DB call so app doesn't crash
        console.error(`⚠ Lỗi getOrSetCache ở key ${key}, fallback gọi thẳng DB:`, error);
        return await fetcher();
    }
};
