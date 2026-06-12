import * as voucherService from '../../services/voucherService.js';
import { asyncHandler } from '../../middleware/errorMiddleware.js';

// 🎫 Áp dụng voucher
export const applyVoucher = asyncHandler(async (req, res) => {
  const { voucherCode, orderTotal } = req.body;
  const voucher = await voucherService.applyVoucher(voucherCode, orderTotal);

  res.status(200).json({
    success: true,
    message: 'Áp dụng mã giảm giá thành công',
    voucher
  });
});

