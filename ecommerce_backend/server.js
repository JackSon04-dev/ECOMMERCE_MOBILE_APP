// server.js
import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import compression from 'compression'
import connectDB from './config/db.js'
import { connectRedis } from './config/redis.js'
import { connectRabbitMQ } from './config/rabbitmq.js'
import authRoutes from './routes/authRoute.js'
// Admin routes
import adminProductRoutes from './routes/admin/productRoutes.js'
import adminUserRoutes from './routes/admin/userRoutes.js'
import adminVoucherRoutes from './routes/admin/voucherRoutes.js'
import adminOrderRoutes from './routes/admin/orderRoutes.js'
import adminReviewRoutes from './routes/admin/reviewRoutes.js'
import adminDashboardRoutes from './routes/admin/dashboardRoutes.js'
import adminNotificationRoutes from './routes/admin/notificationRoute.js'
// User routes
import userProductRoutes from './routes/user/productRoutes.js'
import userReviewRoutes from './routes/user/reviewRoutes.js'
import userOrderRoutes from './routes/user/orderRoutes.js'
import userVoucherRoutes from './routes/user/voucherRoutes.js'
import userPaymentRoutes from './routes/user/paymentRoutes.js'
import userNotificationRoutes from './routes/user/notificationRoute.js'
import userCartRoutes from './routes/user/cartRoutes.js'
import userChatBotRoutes from './routes/user/chatBotRoutes.js'
import { globalLimiter } from './middleware/rateLimitMiddleware.js'
import { errorHandler } from './middleware/errorMiddleware.js'

// Cau hinh bien moi truong
dotenv.config()

// Tao app Express
const app = express()

// Trust proxy (Nginx) to get real client IP
app.set('trust proxy', 1)

// Middleware
app.use(compression()) // Enable Gzip for API data compression
app.use(express.json())
app.use(cors())
app.use(globalLimiter)

// Ket noi DB
connectDB()
// Ket noi Redis
connectRedis()
// Ket noi RabbitMQ
connectRabbitMQ()

// Auth Routes admin hoac nguoi dung, tat ca route bat dau bang /api/auth
app.use('/api/auth', authRoutes)

//Admin routes
app.use('/api/admin/products', adminProductRoutes)
app.use('/api/admin/users', adminUserRoutes)
app.use('/api/admin/vouchers', adminVoucherRoutes)
app.use('/api/admin/orders', adminOrderRoutes)
app.use('/api/admin/dashboard', adminDashboardRoutes)
app.use('/api/admin/reviews', adminReviewRoutes)
app.use('/api/admin/notifications', adminNotificationRoutes)

// User routes
app.use('/api/products', userProductRoutes)
app.use('/api/reviews', userReviewRoutes)
app.use('/api/orders', userOrderRoutes)
app.use('/api/vouchers', userVoucherRoutes)
app.use('/api/payment', userPaymentRoutes)
app.use('/api/notifications', userNotificationRoutes)
app.use('/api/cart', userCartRoutes)
app.use('/api/chatbot', userChatBotRoutes)

// System-wide Global Error Handler
app.use(errorHandler)

// Khoi dong server
const PORT = process.env.PORT || 5000
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`)
})
