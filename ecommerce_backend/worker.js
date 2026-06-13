import dotenv from 'dotenv';
import connectDB from './config/db.js';
import { connectRedis } from './config/redis.js';
import redisClient from './config/redis.js';
import { connectRabbitMQ, getChannel } from './config/rabbitmq.js';
import * as orderService from './services/orderService.js';
import * as paymentService from './services/paymentService.js';
import Order from './models/orderModel.js';

dotenv.config();

const initWorkers = async () => {
  // 1. Kết nối Database & Redis
  await connectDB();
  await connectRedis();

  // 2. Kết nối RabbitMQ
  await connectRabbitMQ();

  // 3. Đợi cho đến khi RabbitMQ Channel sẵn sàng
  console.log('⏳ [Worker] Đang đợi RabbitMQ Channel sẵn sàng...');
  let channel = getChannel();
  while (!channel) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    channel = getChannel();
  }
  console.log('✔ [Worker] RabbitMQ Channel đã sẵn sàng. Đăng ký consumers...');

  // 4. Consumer: order_creation_queue
  channel.prefetch(10); // Khống chế tối đa 10 đơn hàng được xử lý đồng thời
  channel.consume('order_creation_queue', async (msg) => {
    if (!msg) return;

    try {
      const payload = JSON.parse(msg.content.toString());
      const { userId, orderData, orderId } = payload;
      console.log(`📥 [Worker] Nhận yêu cầu tạo đơn hàng: ID=${orderId}, User=${userId}`);

      try {
        // Gọi Service tạo đơn hàng (đã cập nhật nhận preAllocatedId và tự lo Caching)
        const result = await orderService.processCreateOrder(userId, orderData, orderId);

        console.log(`✅ [Worker] Xử lý đơn hàng THÀNH CÔNG: ID=${orderId}`);
        channel.ack(msg);
      } catch (error) {
        console.error(`❌ [Worker] Xử lý đơn hàng THẤT BẠI: ID=${orderId}, Lỗi:`, error.message);

        // Phân biệt lỗi nghiệp vụ (ApiError) và lỗi hệ thống (Mất kết nối MongoDB/mạng)
        const isApiError = error.statusCode !== undefined;

        if (isApiError) {
          // Lỗi nghiệp vụ (đã được Service cache failed): Xóa khỏi queue vì có thử lại vẫn lỗi
          channel.ack(msg); 
        } else {
          // Lỗi hệ thống (mất kết nối MongoDB...): Nack để RabbitMQ giữ lại tin nhắn và gửi lại sau khi DB phục hồi
          console.warn(`🔄 [Worker] Lỗi kết nối hệ thống/Database. Nack và Requeue tin nhắn đơn hàng: ${orderId}`);
          channel.nack(msg, false, true); // requeue: true
        }
      }
    } catch (parseError) {
      console.error('❌ [Worker] Lỗi giải mã dữ liệu order_creation_queue:', parseError.message);
      channel.ack(msg); // Xóa tin nhắn bị hỏng
    }
  });

  // 5. Consumer: payos_payment_queue
  channel.consume('payos_payment_queue', async (msg) => {
    if (!msg) return;

    try {
      const webhookData = JSON.parse(msg.content.toString());
      console.log(`📥 [Worker] Nhận webhook thanh toán PayOS: Code=${webhookData.orderCode}, Số tiền=${webhookData.amount}`);

      try {
        const order = await paymentService.processPayosWebhookSuccess(
          webhookData,
          `Thanh toán PayOS thành công (xác nhận qua Webhook chạy ngầm RabbitMQ)`
        );

        console.log(`🎉 [Worker] Cập nhật thanh toán THÀNH CÔNG cho đơn hàng: ${order._id}`);

        channel.ack(msg);
      } catch (error) {
        console.error('❌ [Worker] Lỗi xử lý webhook PayOS:', error.message);
        
        const isApiError = error.statusCode !== undefined;
        if (isApiError) {
          // Lỗi nghiệp vụ (tiền không khớp, không thấy đơn): Xóa khỏi queue vì requeue vẫn sẽ lỗi
          channel.ack(msg);
        } else {
          // Lỗi kết nối hệ thống/database: Nack và requeue để thử lại sau
          channel.nack(msg, false, true);
        }
      }
    } catch (parseError) {
      console.error('❌ [Worker] Lỗi giải mã dữ liệu payos_payment_queue:', parseError.message);
      channel.ack(msg); // Xóa tin nhắn bị hỏng
    }
  });
};

initWorkers().catch((err) => {
  console.error('❌ [Worker] Lỗi khởi động Worker:', err.message);
  process.exit(1);
});
