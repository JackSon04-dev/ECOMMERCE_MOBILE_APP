import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { OAuth2Client } from 'google-auth-library'
import User from '../models/userModel.js'

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID)

export const register = async (req, res) => {
  const { username, email, password, address, phoneNumber, role } = req.body

  // Kiểm tra các trường bắt buộc
  if (!username || !email || !password) {
    return res.status(400).json({ msg: 'Thiếu các trường bắt buộc' })
  }

  try {
    // Kiểm tra email hoặc username đã tồn tại (Phòng thủ sớm)
    const existingEmail = await User.findOne({ email })
    if (existingEmail) return res.status(400).json({ msg: 'Email đã tồn tại' })

    const existingUser = await User.findOne({ username })
    if (existingUser) return res.status(400).json({ msg: 'Tên người dùng đã tồn tại' })

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
  } catch (err) {
    // Xử lý lỗi trùng lặp từ MongoDB (Mã lỗi 11000)
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern)[0]
      const msg = field === 'email' ? 'Email đã tồn tại' : 'Tên người dùng đã tồn tại'
      return res.status(400).json({ msg })
    }

    // Xử lý lỗi validation từ Mongoose (ví dụ: pass quá ngắn, phoneNumber sai regex)
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(val => val.message)
      return res.status(400).json({ msg: messages[0] })
    }

    console.error('❌ Register error:', err)
    res.status(500).json({ msg: 'Lỗi server', error: err.message })
  }
}

// Login Controller
export const login = async (req, res) => {
  const { email, password, deviceName } = req.body

  try {
    // Kiểm tra người dùng tồn tại
    const user = await User.findOne({ email })
    if (!user) return res.status(400).json({ msg: 'Sai email' })

    // Kiểm tra mật khẩu
    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) return res.status(400).json({ msg: 'Sai mật khẩu' })

    // 🔥 Kiểm tra xem tài khoản có bị khóa không
    if (!user.isActive) {
      return res.status(403).json({ msg: 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên!' })
    }

    // Tạo Access Token (Ngắn hạn - 1 giờ)
    const accessToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '3m' }
    )

    // Tạo Refresh Token (Dài hạn - 7 ngày)
    const refreshToken = jwt.sign(
      { id: user.id },
      process.env.JWT_REFRESH_SECRET, // Phải có key riêng trong .env
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

    // Trả về đúng tên biến mà Flutter đang đợi (accessToken, refreshToken)
    res.json({
      msg: 'Đăng nhập thành công',
      accessToken,
      refreshToken,
      user: userInfo
    })
  } catch (err) {
    res.status(500).json({ msg: 'Lỗi server', error: err.message })
  }
}

// Logout Controller
export const logout = async (req, res) => {
  const { token } = req.body

  // Kiểm tra token có được gửi lên không
  if (!token) {
    return res.status(400).json({ msg: 'Không tìm thấy Token để đăng xuất' })
  }

  try {
    // Tìm user có chứa token này và dùng $pull để xóa nó khỏi mảng
    const user = await User.findOneAndUpdate(
      { 'refreshTokens.token': token },
      { $pull: { refreshTokens: { token: token } } },
      { new: true }
    )

    // Nếu không tìm thấy user nào với token này
    if (!user) {
      return res.status(404).json({
        msg: 'The token does not exist or has been deleted previously.'
      })
    }

    // Thành công
    res.json({
      msg: 'Successfully logged out and the token has been deactivated on the server.'
    })
  } catch (err) {
    res.status(500).json({ msg: 'Logout error' })
  }
}

// --- HÀM LẤY TOKEN MỚI (NEW) ---
export const refreshToken = async (req, res) => {
  const { token } = req.body // Flutter sẽ gửi refreshToken lên đây

  if (!token)
    return res.status(401).json({ msg: 'Không tìm thấy Refresh Token' })

  try {
    // 1. Tìm user nào đang chứa token này trong mảng
    const user = await User.findOne({ 'refreshTokens.token': token })
    if (!user)
      return res.status(403).json({ msg: 'Refresh Token không hợp lệ' })

    // 2. Xác thực chữ ký của Refresh Token
    jwt.verify(token, process.env.JWT_REFRESH_SECRET, (err, decoded) => {
      if (err)
        return res
          .status(403)
          .json({ msg: 'Token đã hết hạn hoặc không hợp lệ' })

      // 3. Nếu mọi thứ OK, tạo Access Token mới
      const newAccessToken = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '3m' }
      )
      // 4. Trả về Access Token mới
      res.json({ accessToken: newAccessToken })
    })
  } catch (err) {
    res.status(500).json({ msg: 'Lỗi server' })
  }
}

// --- HÀM LẤY THÔNG TIN NGƯỜI DÙNG KO CAN LOGIN LAI
export const getMe = async (req, res) => {
  try {
    // req.user được tạo ra từ Middleware verifyToken phía trên
    // Đúng: Truyền thẳng ID vào
    const user = await User.findById(req.user.id).select(
      '-password -refreshTokens'
    )
    // không tìm thấy user
    if (!user) return res.status(404).json({ msg: 'Người dùng không tồn tại' })
    // trả về thông tin user
    const userInfo = {
      id: user._id,
      username: user.username,
      email: user.email,
      address: user.address,
      phoneNumber: user.phoneNumber
    }
    res.json({ user: userInfo })
  } catch (err) {
    console.error(err) // Nên log lỗi ra để debug
    res.status(500).json({ msg: 'Lỗi server' })
  }
}

// --- HÀM CẬP NHẬT THÔNG TIN USER
export const updateProfile = async (req, res) => {
  try {
    const { username, address, phoneNumber } = req.body
    const userId = req.user.id

    // Tìm user
    const user = await User.findById(userId)
    if (!user) return res.status(404).json({ msg: 'Người dùng không tồn tại' })

    // Cập nhật các trường nếu có
    if (username) user.username = username
    if (address) user.address = address
    if (phoneNumber) user.phoneNumber = phoneNumber

    // Lưu vào database
    await user.save()

    // Trả về thông tin user đã cập nhật
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
  } catch (err) {
    console.error(err)
    res.status(500).json({ msg: 'Lỗi server', error: err.message })
  }
}

// --- HÀM ĐỔI MẬT KHẨU
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body
    const userId = req.user.id

    // Kiểm tra các trường bắt buộc
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ msg: 'Vui lòng cung cấp đầy đủ thông tin' })
    }

    // Kiểm tra mật khẩu mới có hợp lệ không
    if (newPassword.length < 6) {
      return res
        .status(400)
        .json({ msg: 'Mật khẩu mới phải có ít nhất 6 ký tự' })
    }

    // Tìm user
    const user = await User.findById(userId)
    if (!user) return res.status(404).json({ msg: 'Người dùng không tồn tại' })

    // Kiểm tra mật khẩu hiện tại
    const isMatch = await bcrypt.compare(currentPassword, user.password)
    if (!isMatch) {
      return res.status(400).json({ msg: 'Mật khẩu hiện tại không đúng' })
    }

    // Mã hóa mật khẩu mới
    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(newPassword, salt)

    // Cập nhật mật khẩu
    user.password = hashedPassword
    await user.save()

    res.json({ msg: 'Đổi mật khẩu thành công' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ msg: 'Lỗi server', error: err.message })
  }
}

// --- ĐĂNG NHẬP BẰNG GOOGLE ---
export const googleLogin = async (req, res) => {
  const { idToken, deviceName } = req.body

  if (!idToken) {
    return res.status(400).json({ msg: 'Thiếu Google ID Token' })
  }

  try {
    // DEBUG: Decode token để xem audience thực tế
    const tokenParts = idToken.split('.')
    const tokenPayloadRaw = JSON.parse(
      Buffer.from(tokenParts[1], 'base64url').toString()
    )
    console.log('🔍 Token audience (aud):', tokenPayloadRaw.aud)
    console.log('🔍 GOOGLE_CLIENT_ID in .env:', process.env.GOOGLE_CLIENT_ID)

    // 1. Xác thực ID Token với Google (chấp nhận cả Web + Android client)
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: [
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_ANDROID_CLIENT_ID
      ].filter(Boolean)
    })
    const payload = ticket.getPayload()
    const { sub: googleId, email, name, picture } = payload

    // 2. Tìm user theo googleId hoặc email
    let user = await User.findOne({ $or: [{ googleId }, { email }] })

    if (user) {
      // Nếu user đã tồn tại nhưng chưa liên kết Google → liên kết
      if (!user.googleId) {
        user.googleId = googleId
        if (picture && !user.avatar) user.avatar = picture
        await user.save()
      }
    } else {
      // 3. Tạo user mới nếu chưa có
      user = new User({
        username: name || email.split('@')[0],
        email,
        googleId,
        avatar: picture || '',
        role: 'user'
      })
      await user.save()
    }

    // 🔥 Kiểm tra xem tài khoản có bị khóa không (Áp dụng cho cả user cũ và mới tạo qua Google)
    if (!user.isActive) {
      return res.status(403).json({ msg: 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên!' })
    }

    // 4. Tạo Access Token
    const accessToken = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '3m' }
    )

    // 5. Tạo Refresh Token
    const refreshToken = jwt.sign(
      { id: user._id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    )

    // 6. Lưu Refresh Token
    user.refreshTokens.push({
      token: refreshToken,
      device: deviceName || 'Unknown Device'
    })
    await user.save()

    // 7. Trả về kết quả
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
  } catch (err) {
    console.error('Google login error:', err)
    res
      .status(401)
      .json({ msg: 'Google Token không hợp lệ', error: err.message })
  }
}
