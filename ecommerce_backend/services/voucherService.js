import Voucher from '../models/voucherModel.js';
import { ApiError } from '../middleware/errorMiddleware.js';

/**
 * 🎫 Apply voucher
 * @param {string} voucherCode - Voucher code entered by customer
 * @param {number} orderTotal - Order total amount before discount
 * @returns {Promise<object>} Valid voucher info object after check
 */
export const applyVoucher = async (voucherCode, orderTotal) => {
  // Validate input
  if (!voucherCode) {
    throw new ApiError(400, 'Vui lòng nhập mã giảm giá');
  }

  if (!orderTotal || orderTotal <= 0) {
    throw new ApiError(400, 'Tổng đơn hàng không hợp lệ');
  }

  // Find voucher by code (case insensitive)
  const voucher = await Voucher.findOne({
    voucherCode: voucherCode.toUpperCase()
  });

  // ❌ Check if voucher exists
  if (!voucher) {
    throw new ApiError(404, 'Mã giảm giá không tồn tại');
  }

  // ❌ Check if voucher is active
  if (!voucher.isActive) {
    throw new ApiError(400, 'Mã giảm giá đã ngưng hoạt động');
  }

  // ❌ Check if uses are remaining
  if (voucher.usageLimit <= 0) {
    throw new ApiError(400, 'Mã giảm giá đã hết lượt sử dụng');
  }

  // ❌ Check if order meets minimum value
  if (orderTotal < voucher.minOrderAmount) {
    throw new ApiError(400, `Đơn hàng tối thiểu ${voucher.minOrderAmount.toLocaleString('vi-VN')}đ để áp dụng mã này`);
  }

  // ✅ Valid voucher
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
