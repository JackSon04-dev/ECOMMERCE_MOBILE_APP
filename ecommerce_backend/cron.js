import dotenv from 'dotenv';
import cron from 'node-cron';
import connectDB from './config/db.js';
import { connectRabbitMQ } from './config/rabbitmq.js';
import { publishToQueue } from './services/rabbitmqService.js';
import Order from './models/orderModel.js';

dotenv.config();

const initCron = async () => {
  console.log('⏰ Khởi động hệ thống Cron Job...');
  
  // Connect Database & RabbitMQ
  await connectDB();
  await connectRabbitMQ();
  console.log('✔ [Cron] Đã kết nối DB và RabbitMQ');

  // Job 1: Every 15 minutes - Scan online orders unpaid for more than 30 minutes
  cron.schedule('*/15 * * * *', async () => {
    console.log('⏳ [Cron Job] Đang quét đơn hàng cần hủy...');
    try {
      const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000);
      
      const expiredOrders = await Order.find({
        status: 'Chờ xác nhận',
        isPaid: false,
        paymentMethod: { $in: ['VNPay', 'ZaloPay', 'PayOS'] },
        createdAt: { $lte: thirtyMinsAgo }
      }).select('_id');

      if (expiredOrders.length === 0) {
        console.log('✔ [Cron Job] Không có đơn hàng nào cần hủy.');
        return;
      }

      console.log(`🔥 [Cron Job] Tìm thấy ${expiredOrders.length} đơn hàng quá hạn. Đang đẩy vào RabbitMQ...`);

      for (const order of expiredOrders) {
        await publishToQueue('cancel_order_queue', { orderId: order._id.toString() });
      }

      console.log('✅ [Cron Job] Hoàn tất đẩy lệnh hủy đơn vào hàng đợi.');
    } catch (error) {
      console.error('❌ [Cron Job] Lỗi khi quét đơn hàng:', error.message);
    }
  });

  console.log('🚀 [Cron] Các Job đã được lên lịch thành công!');
};

initCron().catch(err => {
  console.error('❌ [Cron] Lỗi khởi động hệ thống Cron:', err);
  process.exit(1);
});
