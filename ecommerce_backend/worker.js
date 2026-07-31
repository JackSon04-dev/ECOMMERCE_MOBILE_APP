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
  // 1. Connect Database & Redis
  await connectDB();
  await connectRedis();

  // 2. Connect RabbitMQ
  await connectRabbitMQ();

  // 3. Wait until RabbitMQ Channel is ready
  console.log('⏳ [Worker] Đang đợi RabbitMQ Channel sẵn sàng...');
  let channel = getChannel();
  while (!channel) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    channel = getChannel();
  }
  console.log('✔ [Worker] RabbitMQ Channel đã sẵn sàng. Đăng ký consumers...');

  // 4. Consumer: order_creation_queue
  channel.prefetch(10); // Limit to maximum 10 concurrent processing orders
  channel.consume('order_creation_queue', async (msg) => {
    if (!msg) return;

    try {
      const payload = JSON.parse(msg.content.toString());
      const { userId, orderData, orderId } = payload;
      console.log(`📥 [Worker] Nhận yêu cầu tạo đơn hàng: ID=${orderId}, User=${userId}`);

      try {
        // Call Order Creation Service (updated to receive preAllocatedId and handle its own Caching)
        const result = await orderService.processCreateOrder(userId, orderData, orderId);

        console.log(`✅ [Worker] Xử lý đơn hàng THÀNH CÔNG: ID=${orderId}`);
        channel.ack(msg);
      } catch (error) {
        console.error(`❌ [Worker] Xử lý đơn hàng THẤT BẠI: ID=${orderId}, Lỗi:`, error.message);

        // Differentiate between business logic error (ApiError) and system error (MongoDB/network connection lost)
        const isApiError = error.statusCode !== undefined;

        if (isApiError) {
          // Business error (already cached as failed by Service): Remove from queue because retrying will still fail
          channel.ack(msg);
        } else {
          // System error (MongoDB connection lost...): Nack so RabbitMQ keeps the message and retries after DB recovers
          console.warn(`🔄 [Worker] Lỗi kết nối hệ thống/Database. Nack và Requeue tin nhắn đơn hàng: ${orderId}`);
          channel.nack(msg, false, true); // requeue: true
        }
      }
    } catch (parseError) {
      console.error('❌ [Worker] Lỗi giải mã dữ liệu order_creation_queue:', parseError.message);
      channel.ack(msg); // Remove corrupted message
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
          // Business error (price mismatch, order not found): Remove from queue because requeue will still fail
          channel.ack(msg);
        } else {
          // System/database connection error: Nack and requeue to retry later
          channel.nack(msg, false, true);
        }
      }
    } catch (parseError) {
      console.error('❌ [Worker] Lỗi giải mã dữ liệu payos_payment_queue:', parseError.message);
      channel.ack(msg); // Remove corrupted message
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
        channel.ack(msg); // fcmService cleaned up DB by itself, so just ack
      } catch (error) {
        console.error('❌ [Worker] Lỗi khi gọi Firebase FCM:', error.message);
        // Network error or Firebase down -> requeue to retry later
        channel.nack(msg, false, true);
      }
    } catch (parseError) {
      console.error('❌ [Worker] Lỗi giải mã dữ liệu fcm_broadcast_queue:', parseError.message);
      channel.ack(msg); // Remove corrupted message
    }
  });

  // 7. Consumer: cancel_order_queue (Auto-cancel order)
  channel.consume('cancel_order_queue', async (msg) => {
    if (!msg) return;

    try {
      const payload = JSON.parse(msg.content.toString());
      const { orderId } = payload;
      console.log(`📥 [Worker] Nhận lệnh Hủy Đơn Hàng tự động: ID=${orderId}`);

      try {
        // Cancel order with SYSTEM privilege
        const order = await orderService.processCancelOrder(orderId, 'SYSTEM');
        console.log(`✅ [Worker] Hủy đơn hàng THÀNH CÔNG: ID=${orderId}`);

        // Send FCM Push Notification and save Notification to Database for User
        if (order && order.user) {
          const user = await User.findById(order.user);
          if (user && user.fcmTokens && user.fcmTokens.length > 0) {
            const orderCode = orderId.toString().slice(-8).toUpperCase();
            const title = 'Đơn hàng đã bị hủy ❌';
            const body = `Đơn hàng #${orderCode} của bạn đã bị hủy tự động do quá hạn thanh toán 30 phút.`;

            // Get the image of the first product to display on notification (if any)
            let imageUrl = null;
            if (order.orderItems && order.orderItems.length > 0) {
              imageUrl = order.orderItems[0].variant?.colorImage || order.orderItems[0].productImage;
            }

            // Create new Notification in DB (for User to review in App)
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
          channel.ack(msg); // Business error, delete to prevent loop
        } else {
          channel.nack(msg, false, true); // System error, requeue
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
