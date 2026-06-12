import amqp from 'amqplib';

let connection = null;
let channel = null;
let isConnecting = false;

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost';
const QUEUES = ['order_creation_queue', 'payos_payment_queue'];

/**
 * Khởi tạo kết nối tới RabbitMQ và khai báo các Queue
 */
export const connectRabbitMQ = async () => {
  if (isConnecting) return;
  isConnecting = true;

  console.log(`🔌 [RabbitMQ] Đang kết nối tới ${RABBITMQ_URL}...`);
  try {
    connection = await amqp.connect(RABBITMQ_URL);
    channel = await connection.createChannel();
    isConnecting = false;

    console.log('✔ [RabbitMQ] Kết nối thành công và đã mở channel!');

    // Khai báo các Queue bền vững (durable: true)
    for (const queue of QUEUES) {
      await channel.assertQueue(queue, { durable: true });
      console.log(`📦 [RabbitMQ] Khai báo queue thành công: ${queue}`);
    }

    // Lắng nghe sự kiện đứt kết nối hoặc lỗi
    connection.on('error', (err) => {
      console.error('❌ [RabbitMQ] Lỗi kết nối:', err.message);
      reconnect();
    });

    connection.on('close', () => {
      console.warn('⚠️ [RabbitMQ] Kết nối bị đóng!');
      reconnect();
    });

  } catch (error) {
    isConnecting = false;
    console.error('❌ [RabbitMQ] Kết nối thất bại:', error.message);
    reconnect();
  }
};

/**
 * Cơ chế reconnect tự động sau 5 giây
 */
const reconnect = () => {
  connection = null;
  channel = null;
  setTimeout(() => {
    connectRabbitMQ();
  }, 5000);
};

/**
 * Đẩy tin nhắn vào hàng đợi
 * @param {string} queueName - Tên hàng đợi
 * @param {object} data - Dữ liệu cần gửi (object)
 */
export const publishToQueue = async (queueName, data) => {
  if (!channel) {
    throw new Error('Chưa thiết lập kết nối RabbitMQ hoặc Channel bị đóng');
  }
  
  try {
    const payload = Buffer.from(JSON.stringify(data));
    const result = channel.sendToQueue(queueName, payload, { persistent: true });
    
    if (!result) {
      throw new Error(`Không thể gửi tin nhắn tới queue ${queueName} (Buffer full)`);
    }
    
    console.log(`📤 [RabbitMQ] Đã push tin nhắn thành công vào queue: ${queueName}`);
    return true;
  } catch (error) {
    console.error(`❌ [RabbitMQ] Gửi tin nhắn lỗi tới queue ${queueName}:`, error.message);
    throw error;
  }
};

/**
 * Lấy channel hiện tại (Dành cho Worker)
 */
export const getChannel = () => channel;
