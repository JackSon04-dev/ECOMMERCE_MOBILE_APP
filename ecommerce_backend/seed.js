import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Notification from './models/notification.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env') });

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB connected');
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  }
};

const sampleNotifications = [
  {
    title: 'Chào mừng bạn đến với S-Shop!',
    message: 'Cảm ơn bạn đã tin tưởng và lựa chọn bộ sưu tập thời trang của chúng tôi.',
    type: 'system',
  },
  {
    title: 'Flash Sale Siêu Khủng!',
    message: 'Giảm giá cực sốc lên tới 50% cho toàn bộ sản phẩm giày thể thao. Chỉ trong hôm nay!',
    type: 'promo',
  },
  {
    title: 'Bộ sưu tập Mùa Hè 2026',
    message: 'Khám phá ngay các mẫu áo thun mới nhất cho mùa hè năng động tại cửa hàng.',
    type: 'promo',
  },
  {
    title: 'Ưu đãi cho đơn hàng đầu tiên',
    message: 'Sử dụng mã NEWBIE để được giảm ngay 20,000đ cho đơn hàng đầu tiên từ 100,000đ.',
    type: 'promo',
  },
  {
    title: 'Thông báo bảo trì hệ thống',
    message: 'Hệ thống sẽ bảo trì nâng cấp từ 01:00 đến 03:00 ngày mai để cải thiện trải nghiệm mua sắm.',
    type: 'system',
  },
];

const seedNotifications = async () => {
  try {
    await connectDB();
    
    // Clear existing notifications
    await Notification.deleteMany({});
    console.log('🗑️  Old notifications cleared');

    // Insert new notifications
    await Notification.insertMany(sampleNotifications);
    console.log('✅ 5 Notifications seeded successfully');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding error:', error.message);
    process.exit(1);
  }
};

seedNotifications();
