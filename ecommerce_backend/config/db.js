// config/db.js
import mongoose from 'mongoose'
import dotenv from 'dotenv'

dotenv.config()

// Global Plugin: Áp dụng cho toàn bộ các Schema để chuẩn hóa output JSON
mongoose.plugin((schema) => {
  schema.set('toJSON', {
    virtuals: true, // Đảm bảo lấy các trường ảo nếu có
    transform: (doc, ret) => {
      ret.id = ret._id.toString() // Map _id thành id dạng chuỗi
      delete ret._id // Xóa _id gốc
      delete ret.__v // Xóa version key của Mongo
      return ret
    }
  })
})

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI)
    console.log('MongoDB connected successfully')
  } catch (err) {
    console.error('MongoDB connection error:', err.message)
    process.exit(1) // Thoát nếu kết nối thất bại
  }
}
export default connectDB