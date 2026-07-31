import Voucher from '../../models/voucherModel.js'
import { asyncHandler, ApiError } from '../../middleware/errorMiddleware.js'

// Get list of all vouchers (Admin)
export const getAllVouchers = asyncHandler(async (req, res) => {
  const vouchers = await Voucher.find().sort({ createdAt: -1 })

  res.json({
    success: true,
    data: vouchers
  })
});

// Create new voucher (Admin)
export const createVoucher = asyncHandler(async (req, res) => {
  const { voucherName, voucherCode, minOrderAmount, discountAmount, usageLimit } = req.body

  // Validate required fields
  if (!voucherName || !voucherCode || minOrderAmount == null || discountAmount == null || usageLimit == null) {
    throw new ApiError(400, 'Vui lòng điền đầy đủ thông tin')
  }

  // Validate voucherCode length
  if (voucherCode.length !== 6) {
    throw new ApiError(400, 'Mã voucher phải có đúng 6 ký tự')
  }

  // Check if voucherCode already exists
  const existingVoucher = await Voucher.findOne({ voucherCode: voucherCode.toUpperCase() })
  if (existingVoucher) {
    throw new ApiError(400, 'Mã voucher đã tồn tại')
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
});

// Update voucher (Admin)
export const updateVoucher = asyncHandler(async (req, res) => {
  const { id } = req.params
  const { voucherName, voucherCode, minOrderAmount, discountAmount, usageLimit, isActive } = req.body

  // Tìm voucher
  const voucher = await Voucher.findById(id)

  if (!voucher) {
    throw new ApiError(404, 'Không tìm thấy voucher')
  }

  // If updating voucherCode, check length and duplicates
  if (voucherCode) {
    if (voucherCode.length !== 6) {
      throw new ApiError(400, 'Mã voucher phải có đúng 6 ký tự')
    }

    const existingVoucher = await Voucher.findOne({
      voucherCode: voucherCode.toUpperCase(),
      _id: { $ne: id }
    })

    if (existingVoucher) {
      throw new ApiError(400, 'Mã voucher đã tồn tại')
    }

    voucher.voucherCode = voucherCode.toUpperCase()
  }

  // Update other fields if any
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
});

