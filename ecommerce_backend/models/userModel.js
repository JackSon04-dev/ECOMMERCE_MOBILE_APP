// models/User.js
import mongoose from 'mongoose'

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Email không hợp lệ']
  },
  password: {
    type: String,
    minlength: 6,
    default: null
  },
  googleId: {
    type: String,
    default: null
  },
  avatar: {
    type: String,
    default: ''
  },
  address: {
    type: String,
    trim: true,
    default: ''
  },
  phoneNumber: {
    type: String,
    trim: true,
    match: [
      /^(|0[0-9]{9})$/,
      'Số điện thoại không hợp lệ (bắt đầu bằng 0, 10 số)'
    ],
    default: ''
  },
  role: {
    type: String,
    enum: ['user', 'admin'], // Chỉ cho phép 2 giá trị
    default: 'user'
  },
  refreshTokens: [
    {
      token: { type: String, required: true },
      device: { type: String, default: 'Unknown' }
    }
  ],
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
})

const User = mongoose.model('User', userSchema)
export default User
