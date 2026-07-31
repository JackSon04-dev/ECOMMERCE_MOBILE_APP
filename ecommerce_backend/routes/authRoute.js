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
import { sensitiveLimiter } from '../middleware/rateLimitMiddleware.js'

const router = express.Router() // ✅ REQUIRED

// Apply strict rate limit (5 req/min) to protect sensitive endpoints (prevent Brute-force & Spam)
router.post('/register', sensitiveLimiter, register)
router.post('/login', sensitiveLimiter, login)
router.post('/google-login', sensitiveLimiter, googleLogin)
router.post('/logout', logout)
router.post('/refresh', refreshToken)

// This API must pass Access Token check
router.get('/me', verifyToken, getMe)
router.put('/update-profile', verifyToken, updateProfile)
router.put('/change-password', verifyToken, changePassword)

// FCM Token management (Push Notification)
router.post('/fcm-token', verifyToken, registerFcmToken)
router.delete('/fcm-token', verifyToken, unregisterFcmToken)

export default router // ✅ correct export

