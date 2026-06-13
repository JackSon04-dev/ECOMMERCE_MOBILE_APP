import { getChannel } from '../config/rabbitmq.js';

/**
 * Đẩy tin nhắn vào hàng đợi
 * @param {string} queueName - Tên hàng đợi
 * @param {object} data - Dữ liệu cần gửi (object)
 */
export const publishToQueue = async (queueName, data) => {
  const channel = getChannel();
  if (!channel) {
    throw new Error('Chưa thiết lập kết nối RabbitMQ hoặc Channel bị đóng');
  }
  
  try {
    const payload = Buffer.from(JSON.stringify(data));
    const result = channel.sendToQueue(queueName, payload, { persistent: true });
    
    if (!result) {
      throw new Error(`Không thể gửi tin nhắn tới queue ${queueName} (Buffer full)`);
    }
    
    return true;
  } catch (error) {
    console.error(`❌ [RabbitMQ] Gửi tin nhắn lỗi tới queue ${queueName}:`, error.message);
    throw error;
  }
};
