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
 * Lấy channel hiện tại (Dành cho Worker và Service)
 */
export const getChannel = () => channel;
