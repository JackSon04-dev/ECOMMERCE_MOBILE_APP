// routes/authRoutes.js
import express from 'express'
import {
  getMe,
  login,
  register,
  logout,
  refreshToken,
  updateProfile,
  changePassword,
  googleLogin,
  registerFcmToken,
  unregisterFcmToken
} from '../controllers/authController.js'
import { verifyToken } from '../middleware/authMiddleware.js'

const router = express.Router() // ✅ BẮT BUỘC

router.post('/register', register)
router.post('/login', login)
router.post('/google-login', googleLogin)
router.post('/logout', logout)
router.post('/refresh', refreshToken)

// API này bắt buộc phải qua bước check Access Token
router.get('/me', verifyToken, getMe)
router.put('/update-profile', verifyToken, updateProfile)
router.put('/change-password', verifyToken, changePassword)

// FCM Token management (Push Notification)
router.post('/fcm-token', verifyToken, registerFcmToken)
router.delete('/fcm-token', verifyToken, unregisterFcmToken)

export default router // ✅ export đúng

