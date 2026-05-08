import Voucher from '../../models/voucherModel.js'

// Lấy danh sách tất cả voucher (Admin)
export const getAllVouchers = async (req, res) => {
  try {
    const vouchers = await Voucher.find().sort({ createdAt: -1 })

    res.json({
      success: true,
      data: vouchers
    })
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Lỗi server',
      error: err.message
    })
  }
}

// Tạo voucher mới (Admin)
export const createVoucher = async (req, res) => {
  try {
    const { voucherName, voucherCode, minOrderAmount, discountAmount, usageLimit } = req.body

    // Validate required fields
    if (!voucherName || !voucherCode || minOrderAmount == null || discountAmount == null || usageLimit == null) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng điền đầy đủ thông tin'
      })
    }

    // Validate voucherCode length
    if (voucherCode.length !== 6) {
      return res.status(400).json({
        success: false,
        message: 'Mã voucher phải có đúng 6 ký tự'
      })
    }

    // Check if voucherCode already exists
    const existingVoucher = await Voucher.findOne({ voucherCode: voucherCode.toUpperCase() })
    if (existingVoucher) {
      return res.status(400).json({
        success: false,
        message: 'Mã voucher đã tồn tại'
      })
    }

    // Create new voucher
    const voucher = new Voucher({
      voucherName,
      voucherCode: voucherCode.toUpperCase(),
      minOrderAmount,
      discountAmount,
      usageLimit
    })

    await voucher.save()

    res.status(201).json({
      success: true,
      message: 'Tạo voucher thành công',
      data: voucher
    })
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Lỗi server',
      error: err.message
    })
  }
}

// Cập nhật voucher (Admin)
export const updateVoucher = async (req, res) => {
  try {
    const { id } = req.params
    const { voucherName, voucherCode, minOrderAmount, discountAmount, usageLimit, isActive } = req.body

    // Tìm voucher
    const voucher = await Voucher.findById(id)

    if (!voucher) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy voucher'
      })
    }

    // Nếu cập nhật voucherCode, check độ dài và trùng lặp
    if (voucherCode) {
      if (voucherCode.length !== 6) {
        return res.status(400).json({
          success: false,
          message: 'Mã voucher phải có đúng 6 ký tự'
        })
      }

      const existingVoucher = await Voucher.findOne({
        voucherCode: voucherCode.toUpperCase(),
        _id: { $ne: id }
      })

      if (existingVoucher) {
        return res.status(400).json({
          success: false,
          message: 'Mã voucher đã tồn tại'
        })
      }

      voucher.voucherCode = voucherCode.toUpperCase()
    }

    // Cập nhật các field khác nếu có
    if (voucherName) voucher.voucherName = voucherName
    if (minOrderAmount != null) voucher.minOrderAmount = minOrderAmount
    if (discountAmount != null) voucher.discountAmount = discountAmount
    if (usageLimit != null) voucher.usageLimit = usageLimit
    if (typeof isActive === 'boolean') voucher.isActive = isActive

    await voucher.save()

    res.json({
      success: true,
      message: 'Cập nhật voucher thành công',
      data: voucher
    })
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Lỗi server',
      error: err.message
    })
  }
}
