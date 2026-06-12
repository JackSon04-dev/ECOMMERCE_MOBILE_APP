import Voucher from '../models/voucherModel.js';
import { ApiError } from '../middleware/errorMiddleware.js';

/**
 * 🎫 Áp dụng voucher
 * @param {string} voucherCode - Mã voucher khách hàng nhập vào
 * @param {number} orderTotal - Tổng số tiền của đơn hàng trước giảm giá
 * @returns {Promise<object>} Đối tượng thông tin voucher hợp lệ sau kiểm tra
 */
export const applyVoucher = async (voucherCode, orderTotal) => {
  // Validate input
  if (!voucherCode) {
    throw new ApiError(400, 'Vui lòng nhập mã giảm giá');
  }

  if (!orderTotal || orderTotal <= 0) {
    throw new ApiError(400, 'Tổng đơn hàng không hợp lệ');
  }

  // Tìm voucher theo code (case insensitive)
  const voucher = await Voucher.findOne({
    voucherCode: voucherCode.toUpperCase()
  });

  // ❌ Kiểm tra voucher có tồn tại không
  if (!voucher) {
    throw new ApiError(404, 'Mã giảm giá không tồn tại');
  }

  // ❌ Kiểm tra voucher có đang hoạt động không
  if (!voucher.isActive) {
    throw new ApiError(400, 'Mã giảm giá đã ngưng hoạt động');
  }

  // ❌ Kiểm tra còn lượt dùng không
  if (voucher.usageLimit <= 0) {
    throw new ApiError(400, 'Mã giảm giá đã hết lượt sử dụng');
  }

  // ❌ Kiểm tra đơn hàng có đủ giá trị tối thiểu không
  if (orderTotal < voucher.minOrderAmount) {
    throw new ApiError(400, `Đơn hàng tối thiểu ${voucher.minOrderAmount.toLocaleString('vi-VN')}đ để áp dụng mã này`);
  }

  // ✅ Voucher hợp lệ
  return {
    _id: voucher._id,
    voucherName: voucher.voucherName,
    voucherCode: voucher.voucherCode,
    minOrderAmount: voucher.minOrderAmount,
    discountAmount: voucher.discountAmount,
    usageLimit: voucher.usageLimit,
    isActive: voucher.isActive,
    createdAt: voucher.createdAt
  };
};
