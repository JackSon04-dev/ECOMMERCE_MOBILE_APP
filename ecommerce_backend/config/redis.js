import { createClient } from 'redis';

// Khởi tạo Redis client
const redisClient = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    //disableOfflineQueue: true, // [CỰC KỲ QUAN TRỌNG] Không xếp hàng lệnh khi mất kết nối để tránh treo API
    socket: {
        reconnectStrategy: (retries) => {
            // Thử lại vĩnh viễn sau mỗi 5 giây để tự động phục hồi khi Redis sống lại
            return 5000; 
        },
        connectTimeout: 5000 // Hủy kết nối nếu sau 5s không phản hồi
    }
});

// Bắt sự kiện lỗi và thành công
redisClient.on('error', (err) => {
    // Chỉ log lỗi vắn tắt để tránh làm tràn màn hình Terminal
    console.log(`❌ Redis Error: ${err.message || 'Mất kết nối tới máy chủ Redis'}`);
});
redisClient.on('connect', () => console.log('✔ Redis đang kết nối...'));
redisClient.on('ready', () => console.log('✔ Redis đã kết nối thành công và sẵn sàng!'));

export const connectRedis = async () => {
    try {
        await redisClient.connect();
    } catch (error) {
        // Chỉ log dòng thông báo vắn tắt, không in cả stack trace gây rối mắt
        console.error(`❌ Kết nối Redis thất bại: ${error.message || 'Không thể thiết lập kết nối'}`);
    }
};

export default redisClient;
