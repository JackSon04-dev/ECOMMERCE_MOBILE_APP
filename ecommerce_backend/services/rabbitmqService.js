import { getChannel } from '../config/rabbitmq.js';

/**
 * Push message to queue
 * @param {string} queueName - Queue name
 * @param {object} data - Data to send (object)
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
