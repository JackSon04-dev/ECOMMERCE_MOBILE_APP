import mongoose from 'mongoose'

const voucherSchema = new mongoose.Schema({
  voucherName: {
    type: String,
    required: [true, 'Tên voucher là bắt buộc'],
    trim: true
  },
  voucherCode: {
    type: String,
    required: [true, 'Mã voucher là bắt buộc'],
    uppercase: true,
    trim: true
  },
  minOrderAmount: {
    type: Number,
    required: [true, 'Số tiền đơn hàng tối thiểu là bắt buộc'],
    min: [0, 'Số tiền tối thiểu không được âm']
  },
  discountAmount: {
    type: Number,
    required: [true, 'Số tiền giảm là bắt buộc'],
    min: [0, 'Số tiền giảm không được âm']
  },
  usageLimit: {
    type: Number,
    required: [true, 'Số lượng dùng tối đa là bắt buộc'],
    min: [1, 'Số lượng dùng tối đa phải ít nhất là 1']
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true })

// Setup indexes to optimize query performance
voucherSchema.index({ voucherCode: 1 }, { unique: true })

const Voucher = mongoose.model('Voucher', voucherSchema)
export default Voucher
