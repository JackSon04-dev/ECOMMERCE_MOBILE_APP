import User from '../../models/userModel.js'
import { asyncHandler, ApiError } from '../../middleware/errorMiddleware.js'

// Get list of all users (Admin)
export const getAllUsers = asyncHandler(async (req, res) => {
  // Get users list (exclude password and refreshTokens)
  const users = await User.find()
    .select('-password -refreshTokens')
    .sort({ createdAt: -1 })

  res.json({
    success: true,
    data: users
  })
});

// Update user isActive status (Admin)
export const updateUserStatus = asyncHandler(async (req, res) => {
  const { id } = req.params
  const { isActive } = req.body

  // Validate isActive
  if (typeof isActive !== 'boolean') {
    throw new ApiError(400, 'isActive phải là boolean (true/false)')
  }

  // Find user
  const user = await User.findById(id)

  if (!user) {
    throw new ApiError(404, 'Không tìm thấy người dùng')
  }

  // Update isActive
  user.isActive = isActive

  // If user disabled, clear all refresh tokens
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
});

