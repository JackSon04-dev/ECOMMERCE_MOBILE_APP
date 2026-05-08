import jwt from 'jsonwebtoken'
import User from '../models/userModel.js'

export const verifyToken = async (req, res, next) => {
  // Lấy token từ header
  const authHeader = req.headers.authorization
  const token = authHeader && authHeader.split(' ')[1]

  if (!token) {
    return res
      .status(401)
      .json({ msg: 'Truy cập bị từ chối. Không tìm thấy token!' })
  }

  try {
    // Kiểm tra token với JWT_SECRET
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    
    // 🔥 Kiểm tra xem User có bị khóa không
    const user = await User.findById(decoded.id)
    if (!user) {
      return res.status(404).json({ msg: 'Người dùng không tồn tại!' })
    }
    
    if (!user.isActive) {
      return res.status(403).json({ msg: 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên!' })
    }

    // Lưu thông tin user đã giải mã vào req để các hàm sau sử dụng
    req.user = decoded
    next() // Cho phép đi tiếp vào Controller
  } catch (err) {
    res.status(401).json({ msg: 'Token không hợp lệ hoặc đã hết hạn!' })
  }
}
