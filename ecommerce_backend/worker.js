import dotenv from 'dotenv';
import connectDB from './config/db.js';
import { connectRedis } from './config/redis.js';
import { connectRabbitMQ, getChannel } from './config/rabbitmq.js';
import * as orderService from './services/orderService.js';
import * as paymentService from './services/paymentService.js';
import * as fcmService from './services/fcmService.js';
import User from './models/userModel.js';
import Notification from './models/notification.js';

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

  // 6. Consumer: fcm_broadcast_queue
  channel.consume('fcm_broadcast_queue', async (msg) => {
    if (!msg) return;

    try {
      const payload = JSON.parse(msg.content.toString());
      const { tokens, title, message, data } = payload;
      console.log(`📥 [Worker] Nhận lệnh Broadcast FCM cho ${tokens.length} thiết bị.`);

      try {
        await fcmService.sendPushNotification(tokens, title, message, data || {});
        console.log(`✅ [Worker] Hoàn tất Broadcast FCM cho chunk này.`);
        channel.ack(msg); // fcmService đã tự dọn dẹp DB nên chỉ việc ack
      } catch (error) {
        console.error('❌ [Worker] Lỗi khi gọi Firebase FCM:', error.message);
        // Lỗi mạng hoặc Firebase bị down -> requeue để thử lại sau
        channel.nack(msg, false, true);
      }
    } catch (parseError) {
      console.error('❌ [Worker] Lỗi giải mã dữ liệu fcm_broadcast_queue:', parseError.message);
      channel.ack(msg); // Xóa tin nhắn bị hỏng
    }
  });

  // 7. Consumer: cancel_order_queue (Hủy đơn hàng tự động)
  channel.consume('cancel_order_queue', async (msg) => {
    if (!msg) return;

    try {
      const payload = JSON.parse(msg.content.toString());
      const { orderId } = payload;
      console.log(`📥 [Worker] Nhận lệnh Hủy Đơn Hàng tự động: ID=${orderId}`);

      try {
        // Hủy đơn hàng với quyền SYSTEM
        const order = await orderService.processCancelOrder(orderId, 'SYSTEM');
        console.log(`✅ [Worker] Hủy đơn hàng THÀNH CÔNG: ID=${orderId}`);

        // Gửi FCM Push Notification và lưu Notification vào Database cho User
        if (order && order.user) {
          const user = await User.findById(order.user);
          if (user && user.fcmTokens && user.fcmTokens.length > 0) {
            const orderCode = orderId.toString().slice(-8).toUpperCase();
            const title = 'Đơn hàng đã bị hủy ❌';
            const body = `Đơn hàng #${orderCode} của bạn đã bị hủy tự động do quá hạn thanh toán 30 phút.`;

            // Lấy ảnh của sản phẩm đầu tiên để hiển thị trên thông báo (nếu có)
            let imageUrl = null;
            if (order.orderItems && order.orderItems.length > 0) {
              imageUrl = order.orderItems[0].variant?.colorImage || order.orderItems[0].productImage;
            }

            // Tạo Notification mới trong DB (để User xem lại trong App)
            const notification = await Notification.create({
              userId: order.user,
              title,
              message: body,
              type: 'ORDER',
              referenceId: order._id,
              imageUrl: imageUrl
            });

            const tokens = user.fcmTokens.map(t => t.token);
            await fcmService.sendPushNotification(tokens, title, body, {
              type: 'ORDER',
              referenceId: orderId.toString(),
              status: 'Đã hủy',
              notificationId: notification._id.toString()
            }, imageUrl);
          }
        }

        channel.ack(msg);
      } catch (error) {
        console.error(`❌ [Worker] Lỗi hủy đơn hàng ID=${orderId}:`, error.message);
        const isApiError = error.statusCode !== undefined;
        if (isApiError) {
          channel.ack(msg); // Lỗi nghiệp vụ, xóa để không lặp lại
        } else {
          channel.nack(msg, false, true); // Lỗi hệ thống, requeue
        }
      }
    } catch (parseError) {
      console.error('❌ [Worker] Lỗi giải mã dữ liệu cancel_order_queue:', parseError.message);
      channel.ack(msg);
    }
  });
};

initWorkers().catch((err) => {
  console.error('❌ [Worker] Lỗi khởi động Worker:', err.message);
  process.exit(1);
});
