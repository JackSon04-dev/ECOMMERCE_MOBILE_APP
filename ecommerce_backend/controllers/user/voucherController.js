import Voucher from '../../models/voucherModel.js'

// 🎫 Áp dụng voucher
export const applyVoucher = async (req, res) => {
  try {
    const { voucherCode, orderTotal } = req.body

    // Validate input
    if (!voucherCode) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập mã giảm giá'
      })
    }

    if (!orderTotal || orderTotal <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Tổng đơn hàng không hợp lệ'
      })
    }

    // Tìm voucher theo code (case insensitive)
    const voucher = await Voucher.findOne({
      voucherCode: voucherCode.toUpperCase()
    })

    // ❌ Kiểm tra voucher có tồn tại không
    if (!voucher) {
      return res.status(404).json({
        success: false,
        message: 'Mã giảm giá không tồn tại'
      })
    }

    // ❌ Kiểm tra voucher có đang hoạt động không
    if (!voucher.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Mã giảm giá đã ngừng hoạt động'
      })
    }

    // ❌ Kiểm tra còn lượt dùng không
    if (voucher.usageLimit <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Mã giảm giá đã hết lượt sử dụng'
      })
    }

    // ❌ Kiểm tra đơn hàng có đủ giá trị tối thiểu không
    if (orderTotal < voucher.minOrderAmount) {
      return res.status(400).json({
        success: false,
        message: `Đơn hàng tối thiểu ${voucher.minOrderAmount.toLocaleString('vi-VN')}đ để áp dụng mã này`
      })
    }

    // ✅ Voucher hợp lệ
    res.status(200).json({
      success: true,
      message: 'Áp dụng mã giảm giá thành công',
      voucher: {
        _id: voucher._id,
        voucherName: voucher.voucherName,
        voucherCode: voucher.voucherCode,
        minOrderAmount: voucher.minOrderAmount,
        discountAmount: voucher.discountAmount,
        usageLimit: voucher.usageLimit,
        isActive: voucher.isActive,
        createdAt: voucher.createdAt
      }
    })
  } catch (error) {
    console.error('❌ Apply voucher error:', error)
    res.status(500).json({
      success: false,
      message: 'Lỗi khi áp dụng mã giảm giá',
      error: error.message
    })
  }
}
