import * as voucherService from '../../services/voucherService.js';

// 🎫 Áp dụng voucher
export const applyVoucher = async (req, res) => {
  try {
    const { voucherCode, orderTotal } = req.body;

    const voucher = await voucherService.applyVoucher(voucherCode, orderTotal);

    res.status(200).json({
      success: true,
      message: 'Áp dụng mã giảm giá thành công',
      voucher
    });
  } catch (error) {
    console.error('❌ Apply voucher error:', error);
    const statusCode = error.message.includes('không tồn tại') ? 404 : 
                      (error.message.includes('Vui lòng') || error.message.includes('không hợp lệ') || error.message.includes('ngừng hoạt động') || error.message.includes('hết lượt') || error.message.includes('tối thiểu') ? 400 : 500);
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Lỗi khi áp dụng mã giảm giá',
      error: error.message
    });
  }
};
