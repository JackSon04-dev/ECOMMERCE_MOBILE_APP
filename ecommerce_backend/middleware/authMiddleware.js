import jwt from 'jsonwebtoken'
import User from '../models/userModel.js'
import { asyncHandler, ApiError } from '../middleware/errorMiddleware.js'

/**
 * 🔐 verifyToken - Verify Access Token from Authorization header
 * Use asyncHandler so JWT errors (JsonWebTokenError, TokenExpiredError)
 * are forwarded to centralized errorHandler instead of manual handling.
 */
export const verifyToken = asyncHandler(async (req, res, next) => {
  // Get token from header
  const authHeader = req.headers.authorization
  const token = authHeader && authHeader.split(' ')[1]

  if (!token) {
    throw new ApiError(401, 'Truy cập bị từ chối. Không tìm thấy token!')
  }

  // jwt.verify throws JsonWebTokenError or TokenExpiredError if invalid/expired
  // asyncHandler catches and forwards to errorHandler for unified handling
  const decoded = jwt.verify(token, process.env.JWT_SECRET)

  // 🔥 Check if User is locked
  const user = await User.findById(decoded.id)
  if (!user) {
    throw new ApiError(404, 'Người dùng không tồn tại!')
  }

  if (!user.isActive) {
    throw new ApiError(403, 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên!')
  }

  // Save decoded user info to req for subsequent functions
  req.user = decoded
  next() // Allow proceeding to Controller
})

/**
 * 🛡️ restrictToRoles - Check role permissions
 * Middleware factory: receives array of allowed roles, returns middleware function.
 */
export const restrictToRoles = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ApiError(401, 'Không tìm thấy thông tin người dùng!'))
    }

    const userRole = req.user.role ? req.user.role.toLowerCase() : ''
    const allowedRoles = roles.map(role => role.toLowerCase())

    if (!allowedRoles.includes(userRole)) {
      return next(new ApiError(403, 'Bạn không có quyền thực hiện hành động này!'))
    }

    next()
  }
}
