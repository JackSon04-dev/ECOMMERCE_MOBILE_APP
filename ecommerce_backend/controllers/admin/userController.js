import User from '../../models/userModel.js'

// Lấy danh sách tất cả người dùng (Admin)
export const getAllUsers = async (req, res) => {
  try {
    // Lấy danh sách users (không lấy password và refreshTokens)
    const users = await User.find()
      .select('-password -refreshTokens')
      .sort({ createdAt: -1 })

    res.json({
      success: true,
      data: users
    })
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Lỗi server',
      error: err.message
    })
  }
}

// Cập nhật trạng thái isActive của user (Admin)
export const updateUserStatus = async (req, res) => {
  try {
    const { id } = req.params
    const { isActive } = req.body

    // Validate isActive
    if (typeof isActive !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'isActive phải là boolean (true/false)'
      })
    }

    // Tìm user
    const user = await User.findById(id)

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy người dùng'
      })
    }

    // Cập nhật isActive
    user.isActive = isActive

    // Nếu vô hiệu hóa user, xóa tất cả refresh tokens
    if (!isActive) {
      user.refreshTokens = []
    }

    await user.save()

    res.json({
      success: true,
      message: isActive
        ? 'Đã kích hoạt tài khoản người dùng'
        : 'Đã vô hiệu hóa tài khoản người dùng',
      data: {
        _id: user._id,
        username: user.username,
        email: user.email,
        isActive: user.isActive
      }
    })
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Lỗi server',
      error: err.message
    })
  }
}
