import redisClient from '../config/redis.js';

/**
 * Lấy dữ liệu từ Redis Cache
 * @param {string} key Khóa lưu trữ trong Redis
 * @returns {object|null} Dữ liệu đã parse hoặc null nếu không tồn tại
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
        return null; // Trả về null để hệ thống đi tiếp vào Database thay vì Crash
    }
};

/**
 * Lưu dữ liệu vào Redis Cache với thời gian hết hạn (TTL)
 * @param {string} key Khóa lưu trữ
 * @param {any} data Dữ liệu cần lưu (sẽ được stringify)
 * @param {number} ttl Thời gian sống (giây) - Mặc định 600s (10 phút)
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
 * Xóa một Cache cụ thể
 * @param {string} key Khóa cần xóa
 */
export const deleteCache = async (key) => {
    try {
        if (!redisClient.isReady) return;
        
        await redisClient.del(key);
    } catch (error) {
        console.error(`❌ Lỗi khi xóa cache cho key ${key}:`, error);
    }
};

/**
 * Siêu hàm Wrapper: Tự động hóa luồng Check Cache -> Gọi DB -> Save Cache
 * @param {string} key Khóa lưu trữ
 * @param {number} ttl Thời gian sống (giây)
 * @param {Function} fetcher Hàm Async gọi xuống Database nếu Cache miss
 * @returns {any|null} Dữ liệu (từ Cache hoặc từ DB)
 */
export const getOrSetCache = async (key, ttl, fetcher) => {
    try {
        // Bước 1: Kiểm tra Cache
        const cachedData = await getCache(key);
        if (cachedData) {
            return cachedData;
        }

        // Bước 2: Không có Cache -> Chạy hàm gọi DB
        const freshData = await fetcher();

        // Bước 3: Có dữ liệu mới -> Lưu vào Cache
        if (freshData) {
            await setCache(key, freshData, ttl);
        }

        return freshData;
    } catch (error) {
        // Nếu toàn bộ tiến trình Redis lỗi, vẫn cố gắng gọi DB để ứng dụng không sập
        console.error(`⚠ Lỗi getOrSetCache ở key ${key}, fallback gọi thẳng DB:`, error);
        return await fetcher();
    }
};
