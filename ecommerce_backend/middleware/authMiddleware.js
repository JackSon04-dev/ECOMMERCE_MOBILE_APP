import jwt from 'jsonwebtoken'
import User from '../models/userModel.js'
import { asyncHandler, ApiError } from '../middleware/errorMiddleware.js'

/**
 * 🔐 verifyToken - Xác thực Access Token từ Authorization header
 * Dùng asyncHandler để JWT errors (JsonWebTokenError, TokenExpiredError)
 * được forward tới errorHandler tập trung thay vì xử lý thủ công.
 */
export const verifyToken = asyncHandler(async (req, res, next) => {
  // Lấy token từ header
  const authHeader = req.headers.authorization
  const token = authHeader && authHeader.split(' ')[1]

  if (!token) {
    throw new ApiError(401, 'Truy cập bị từ chối. Không tìm thấy token!')
  }

  // jwt.verify sẽ throw JsonWebTokenError hoặc TokenExpiredError nếu token sai/hết hạn
  // asyncHandler sẽ catch và forward tới errorHandler để xử lý đồng nhất
  const decoded = jwt.verify(token, process.env.JWT_SECRET)

  // 🔥 Kiểm tra xem User có bị khóa không
  const user = await User.findById(decoded.id)
  if (!user) {
    throw new ApiError(404, 'Người dùng không tồn tại!')
  }

  if (!user.isActive) {
    throw new ApiError(403, 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên!')
  }

  // Lưu thông tin user đã giải mã vào req để các hàm sau sử dụng
  req.user = decoded
  next() // Cho phép đi tiếp vào Controller
})

/**
 * 🛡️ restrictToRoles - Kiểm tra quyền theo role
 * Middleware factory: nhận vào mảng roles được phép, trả về middleware function.
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
