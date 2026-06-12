import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { OAuth2Client } from 'google-auth-library'
import User from '../models/userModel.js'
import { asyncHandler, ApiError } from '../middleware/errorMiddleware.js'

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID)

// Register Controller
export const register = asyncHandler(async (req, res) => {
  const { username, email, password, address, phoneNumber, role } = req.body

  // Kiểm tra các trường bắt buộc
  if (!username || !email || !password) {
    throw new ApiError(400, 'Thiếu các trường bắt buộc')
  }

  // Kiểm tra email đã tồn tại (Phòng thủ sớm)
  const existingEmail = await User.findOne({ email })
  if (existingEmail) {
    throw new ApiError(400, 'Email đã tồn tại')
  }

  // Mã hóa mật khẩu
  const salt = await bcrypt.genSalt(10)
  const hashedPassword = await bcrypt.hash(password, salt)

  // Tạo người dùng mới
  const user = new User({
    username,
    email,
    password: hashedPassword,
    address,
    phoneNumber,
    role: role || 'user'
  })

  // Lưu người dùng vào database
  await user.save()

  // Trả về phản hồi thành công
  res.status(201).json({ msg: 'Đăng ký thành công' })
})

// Login Controller
export const login = asyncHandler(async (req, res) => {
  const { email, password, deviceName } = req.body

  // Kiểm tra người dùng tồn tại
  const user = await User.findOne({ email })
  if (!user) {
    throw new ApiError(400, 'Sai email')
  }

  // Kiểm tra mật khẩu
  const isMatch = await bcrypt.compare(password, user.password)
  if (!isMatch) {
    throw new ApiError(400, 'Sai mật khẩu')
  }

  // Kiểm tra xem tài khoản có bị khóa không
  if (!user.isActive) {
    throw new ApiError(403, 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên!')
  }

  // Tạo Access Token (Ngắn hạn - 3 phút để test)
  const accessToken = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '3m' }
  )

  // Tạo Refresh Token (Dài hạn - 7 ngày)
  const refreshToken = jwt.sign(
    { id: user.id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  )

  // Đẩy Token mới và tên thiết bị vào mảng refreshTokens
  user.refreshTokens.push({
    token: refreshToken,
    device: deviceName || 'Unknown Device'
  })

  // Lưu lại vào MongoDB
  await user.save()

  // Loại bỏ password và refreshTokens khỏi thông tin user trả về
  const userInfo = {
    id: user._id,
    username: user.username,
    email: user.email,
    address: user.address,
    role: user.role,
    phoneNumber: user.phoneNumber
  }

  res.json({
    msg: 'Đăng nhập thành công',
    accessToken,
    refreshToken,
    user: userInfo
  })
})

// Logout Controller
export const logout = asyncHandler(async (req, res) => {
  const { token } = req.body

  if (!token) {
    throw new ApiError(400, 'Không tìm thấy Token để đăng xuất')
  }

  // Tìm user có chứa token này và dùng $pull để xóa nó khỏi mảng
  const user = await User.findOneAndUpdate(
    { 'refreshTokens.token': token },
    { $pull: { refreshTokens: { token: token } } },
    { new: true }
  )

  if (!user) {
    throw new ApiError(404, 'The token does not exist or has been deleted previously.')
  }

  res.json({
    msg: 'Successfully logged out and the token has been deactivated on the server.'
  })
})

// Refresh Token Controller
export const refreshToken = asyncHandler(async (req, res) => {
  const { token } = req.body

  if (!token) {
    throw new ApiError(401, 'Không tìm thấy Refresh Token')
  }

  const user = await User.findOne({ 'refreshTokens.token': token })
  if (!user) {
    throw new ApiError(403, 'Refresh Token không hợp lệ')
  }

  // Xác thực chữ ký của Refresh Token
  try {
    jwt.verify(token, process.env.JWT_REFRESH_SECRET)
    
    // Tạo Access Token mới
    const newAccessToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '3m' }
    )
    
    res.json({ accessToken: newAccessToken })
  } catch (err) {
    throw new ApiError(403, 'Token đã hết hạn hoặc không hợp lệ')
  }
})

// Get Me Controller
export const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).select('-password -refreshTokens')
  if (!user) {
    throw new ApiError(404, 'Người dùng không tồn tại')
  }

  const userInfo = {
    id: user._id,
    username: user.username,
    email: user.email,
    address: user.address,
    phoneNumber: user.phoneNumber
  }
  
  res.json({ user: userInfo })
})

// Update Profile Controller
export const updateProfile = asyncHandler(async (req, res) => {
  const { username, address, phoneNumber } = req.body
  const userId = req.user.id

  const user = await User.findById(userId)
  if (!user) {
    throw new ApiError(404, 'Người dùng không tồn tại')
  }

  if (username) user.username = username
  if (address) user.address = address
  if (phoneNumber) user.phoneNumber = phoneNumber

  await user.save()

  const userInfo = {
    id: user._id,
    username: user.username,
    email: user.email,
    address: user.address,
    phoneNumber: user.phoneNumber
  }

  res.json({
    msg: 'Cập nhật thông tin thành công',
    user: userInfo
  })
})

// Change Password Controller
export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body
  const userId = req.user.id

  if (!currentPassword || !newPassword) {
    throw new ApiError(400, 'Vui lòng cung cấp đầy đủ thông tin')
  }

  if (newPassword.length < 6) {
    throw new ApiError(400, 'Mật khẩu mới phải có ít nhất 6 ký tự')
  }

  const user = await User.findById(userId)
  if (!user) {
    throw new ApiError(404, 'Người dùng không tồn tại')
  }

  const isMatch = await bcrypt.compare(currentPassword, user.password)
  if (!isMatch) {
    throw new ApiError(400, 'Mật khẩu hiện tại không đúng')
  }

  const salt = await bcrypt.genSalt(10)
  const hashedPassword = await bcrypt.hash(newPassword, salt)

  user.password = hashedPassword
  await user.save()

  res.json({ msg: 'Đổi mật khẩu thành công' })
})

// Google Login Controller
export const googleLogin = asyncHandler(async (req, res) => {
  const { idToken, deviceName } = req.body

  if (!idToken) {
    throw new ApiError(400, 'Thiếu Google ID Token')
  }

  // Xác thực ID Token với Google
  let payload
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: [
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_ANDROID_CLIENT_ID
      ].filter(Boolean)
    })
    payload = ticket.getPayload()
  } catch (err) {
    throw new ApiError(401, 'Google Token không hợp lệ: ' + err.message)
  }

  const { sub: googleId, email, name, picture } = payload

  let user = await User.findOne({ $or: [{ googleId }, { email }] })

  if (user) {
    if (!user.googleId) {
      user.googleId = googleId
      if (picture && !user.avatar) user.avatar = picture
      await user.save()
    }
  } else {
    user = new User({
      username: name || email.split('@')[0],
      email,
      googleId,
      avatar: picture || '',
      role: 'user'
    })
    await user.save()
  }

  if (!user.isActive) {
    throw new ApiError(403, 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên!')
  }

  const accessToken = jwt.sign(
    { id: user._id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '3m' }
  )

  const refreshToken = jwt.sign(
    { id: user._id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  )

  user.refreshTokens.push({
    token: refreshToken,
    device: deviceName || 'Unknown Device'
  })
  await user.save()

  const userInfo = {
    id: user._id,
    username: user.username,
    email: user.email,
    address: user.address,
    phoneNumber: user.phoneNumber,
    avatar: user.avatar
  }

  res.json({
    msg: 'Đăng nhập Google thành công',
    accessToken,
    refreshToken,
    user: userInfo
  })
})

// Register FCM Token
export const registerFcmToken = asyncHandler(async (req, res) => {
  const { fcmToken, deviceName } = req.body
  const userId = req.user.id

  if (!fcmToken) {
    throw new ApiError(400, 'Thiếu FCM Token')
  }

  const user = await User.findById(userId)
  if (!user) {
    throw new ApiError(404, 'Không tìm thấy user')
  }

  const existingToken = user.fcmTokens.find(t => t.token === fcmToken)
  if (existingToken) {
    existingToken.device = deviceName || existingToken.device
    existingToken.updatedAt = new Date()
  } else {
    user.fcmTokens.push({
      token: fcmToken,
      device: deviceName || 'Unknown'
    })
  }

  await user.save()

  res.status(200).json({
    msg: 'Đăng ký FCM Token thành công',
    tokenCount: user.fcmTokens.length
  })
})

// Unregister FCM Token
export const unregisterFcmToken = asyncHandler(async (req, res) => {
  const { fcmToken } = req.body
  const userId = req.user.id

  if (!fcmToken) {
    throw new ApiError(400, 'Thiếu FCM Token')
  }

  await User.findByIdAndUpdate(userId, {
    $pull: { fcmTokens: { token: fcmToken } }
  })

  res.status(200).json({
    msg: 'Hủy đăng ký FCM Token thành công'
  })
})
