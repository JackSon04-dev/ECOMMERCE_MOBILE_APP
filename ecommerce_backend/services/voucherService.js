import Voucher from '../models/voucherModel.js';

/**
 * 🎫 Áp dụng voucher
 * @param {string} voucherCode - Mã voucher khách hàng nhập vào
 * @param {number} orderTotal - Tổng số tiền của đơn hàng trước giảm giá
 * @returns {Promise<object>} Đối tượng thông tin voucher hợp lệ sau kiểm tra
 */
export const applyVoucher = async (voucherCode, orderTotal) => {
  // Validate input
  if (!voucherCode) {
    throw new Error('Vui lòng nhập mã giảm giá');
  }

  if (!orderTotal || orderTotal <= 0) {
    throw new Error('Tổng đơn hàng không hợp lệ');
  }

  // Tìm voucher theo code (case insensitive)
  const voucher = await Voucher.findOne({
    voucherCode: voucherCode.toUpperCase()
  });

  // ❌ Kiểm tra voucher có tồn tại không
  if (!voucher) {
    throw new Error('Mã giảm giá không tồn tại');
  }

  // ❌ Kiểm tra voucher có đang hoạt động không
  if (!voucher.isActive) {
    throw new Error('Mã giảm giá đã ngừng hoạt động');
  }

  // ❌ Kiểm tra còn lượt dùng không
  if (voucher.usageLimit <= 0) {
    throw new Error('Mã giảm giá đã hết lượt sử dụng');
  }

  // ❌ Kiểm tra đơn hàng có đủ giá trị tối thiểu không
  if (orderTotal < voucher.minOrderAmount) {
    throw new Error(`Đơn hàng tối thiểu ${voucher.minOrderAmount.toLocaleString('vi-VN')}đ để áp dụng mã này`);
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
