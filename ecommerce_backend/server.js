// server.js
import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import connectDB from './config/db.js'
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

// Cau hinh bien moi truong
dotenv.config()

// Tao app Express
const app = express()

// Middleware
app.use(express.json())
app.use(cors())

// Ket noi DB
connectDB()

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

// Khoi dong server
const PORT = process.env.PORT || 5000
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`)
})

// Xu ly loi upload file tu multer
app.use((err, req, res, next) => {
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({
      success: false,
      message: 'Ten truong upload khong dung (Phai la thumbnail hoac images)'
    })
  }
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Loi Server noi bo'
  })
})
