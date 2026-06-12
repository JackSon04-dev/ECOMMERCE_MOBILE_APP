import * as paymentService from '../../services/paymentService.js';
import { asyncHandler, ApiError } from '../../middleware/errorMiddleware.js';
import { publishToQueue } from '../../services/rabbitmqService.js';

/**
 * 💳 Tạo URL thanh toán VNPay
 * POST /api/payment/create_payment_url
 * Body: { orderId }
 */
export const createPaymentUrl = asyncHandler(async (req, res) => {
  console.log('\n📥 [createPaymentUrl] Called');
  const { orderId } = req.body;
  const userId = req.user.id;

  // Lấy baseUrl từ body hoặc request host
  let reqBaseUrl = null;
  if (req.body.baseUrl) {
    reqBaseUrl = req.body.baseUrl;
  } else {
    const protocol = req.protocol;
    let host = req.get('host');
    reqBaseUrl = `${protocol}://${host}`;
  }

  // Service tự throw ApiError với đúng status code → asyncHandler forward về errorHandler
  const { paymentUrl, txnRef } = await paymentService.createPaymentUrl(orderId, userId, reqBaseUrl);

  res.status(200).json({
    success: true,
    paymentUrl,
    txnRef
  });
});

/**
 * 🔄 VNPay Return URL - User được redirect về đây sau khi thanh toán
 * GET /api/payment/vnpay_return
 */
export const vnpayReturn = asyncHandler(async (req, res) => {
  console.log('\n🌏 [VNPay Return] Browser redirect gọi vào backend');
  try {
    const result = await paymentService.processVnpayReturn(req.query);

    if (result.success) {
      // Redirect về trang thành công
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>Thanh toán thành công</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: 'Segoe UI', Arial, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
              background: linear-gradient(135deg, #e8f5e9 0%, #f1f8e9 100%);
            }
            .card {
              background: white;
              border-radius: 24px;
              padding: 48px 40px;
              max-width: 420px;
              width: 90%;
              box-shadow: 0 8px 32px rgba(76,175,80,0.15);
              text-align: center;
              animation: slideUp 0.4s ease;
            }
            @keyframes slideUp {
              from { opacity: 0; transform: translateY(24px); }
              to   { opacity: 1; transform: translateY(0); }
            }
            .circle {
              width: 96px;
              height: 96px;
              background: linear-gradient(135deg, #43e97b, #38f9d7);
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              margin: 0 auto 24px;
              box-shadow: 0 4px 20px rgba(67,233,123,0.4);
            }
            .checkmark {
              font-size: 48px;
              line-height: 1;
            }
            .title {
              color: #2e7d32;
              font-size: 26px;
              font-weight: 700;
              margin-bottom: 12px;
            }
            .message {
              color: #555;
              font-size: 16px;
              line-height: 1.6;
              margin-bottom: 8px;
            }
            .divider {
              width: 48px;
              height: 3px;
              background: linear-gradient(135deg, #43e97b, #38f9d7);
              border-radius: 2px;
              margin: 20px auto;
            }
            .note {
              color: #999;
              font-size: 13px;
            }
            .badge {
              display: inline-block;
              background: #e8f5e9;
              color: #2e7d32;
              font-size: 12px;
              font-weight: 600;
              padding: 4px 12px;
              border-radius: 20px;
              margin-top: 20px;
            }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="circle">
              <span class="checkmark">✓</span>
            </div>
            <div class="title">Thanh toán thành công!</div>
            <div class="message">Đơn hàng của bạn đã được xác nhận và đang được xử lý.</div>
            <div class="divider"></div>
            <div class="note">Vui lòng quay lại ứng dụng để theo dõi đơn hàng.</div>
            <div class="badge">✔ Giao dịch hoàn tất</div>
          </div>
        </body>
        </html>
      `);
    } else {
      // Thanh toán thất bại
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>Thanh toán thất bại</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: 'Segoe UI', Arial, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
              background: linear-gradient(135deg, #fce4ec 0%, #fff3e0 100%);
            }
            .card {
              background: white;
              border-radius: 24px;
              padding: 48px 40px;
              max-width: 420px;
              width: 90%;
              box-shadow: 0 8px 32px rgba(244,67,54,0.12);
              text-align: center;
              animation: slideUp 0.4s ease;
            }
            @keyframes slideUp {
              from { opacity: 0; transform: translateY(24px); }
              to   { opacity: 1; transform: translateY(0); }
            }
            .circle {
              width: 96px;
              height: 96px;
              background: linear-gradient(135deg, #ff6b6b, #ff8e53);
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              margin: 0 auto 24px;
              box-shadow: 0 4px 20px rgba(255,107,107,0.4);
            }
            .xmark {
              font-size: 48px;
              line-height: 1;
              color: white;
            }
            .title {
              color: #c62828;
              font-size: 26px;
              font-weight: 700;
              margin-bottom: 12px;
            }
            .message {
              color: #555;
              font-size: 16px;
              line-height: 1.6;
              margin-bottom: 8px;
            }
            .divider {
              width: 48px;
              height: 3px;
              background: linear-gradient(135deg, #ff6b6b, #ff8e53);
              border-radius: 2px;
              margin: 20px auto;
            }
            .note {
              color: #999;
              font-size: 13px;
            }
            .badge {
              display: inline-block;
              background: #fce4ec;
              color: #c62828;
              font-size: 12px;
              font-weight: 600;
              padding: 4px 12px;
              border-radius: 20px;
              margin-top: 20px;
            }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="circle">
              <span class="xmark">✕</span>
            </div>
            <div class="title">Thanh toán thất bại</div>
            <div class="message">Giao dịch không thành công hoặc đã bị hủy.</div>
            <div class="divider"></div>
            <div class="note">Vui lòng quay lại ứng dụng và thử lại.</div>
            <div class="badge">✕ Giao dịch thất bại</div>
          </div>
        </body>
        </html>
      `);
    }
  } catch (error) {
    throw new ApiError(500, error.message || 'Lỗi xử lý kết quả thanh toán');
  }
});

/**
 * 📡 VNPay IPN (Instant Payment Notification)
 * VNPay server gọi endpoint này để thông báo kết quả thanh toán
 * GET /api/payment/vnpay_ipn
 */
export const vnpayIpn = asyncHandler(async (req, res) => {
  console.log('\n📡 [VNPay IPN] VNPay SERVER gọi thẳng vào backend');
  try {
    const result = await paymentService.processVnpayIpn(req.query);
    return res.json(result);
  } catch (error) {
    // VNPay IPN requires custom response code on failure
    return res.json({ RspCode: '99', Message: 'Unknown error' });
  }
});

/**
 * 🔍 Kiểm tra trạng thái thanh toán của đơn hàng
 * GET /api/payment/status/:orderId
 */
export const checkPaymentStatus = asyncHandler(async (req, res) => {
  console.log('\n📥 [checkPaymentStatus] Called');
  const { orderId } = req.params;
  const userId = req.user.id;

  const data = await paymentService.checkPaymentStatus(orderId, userId);

  res.status(200).json({
    success: true,
    ...data
  });
});

/**
 * 💳 Tạo URL thanh toán ZaloPay
 * POST /api/payment/create_zalopay_url
 * Body: { orderId }
 */
export const createZalopayPaymentUrl = asyncHandler(async (req, res) => {
  console.log('\n📥 [createZalopayPaymentUrl] Called');
  const { orderId } = req.body;
  const userId = req.user.id;

  const data = await paymentService.createZalopayPaymentUrl(orderId, userId);

  res.status(200).json({
    success: true,
    ...data
  });
});

/**
 * 📡 ZaloPay Callback (Webhook - Server to Server)
 * POST /api/payment/zalopay_callback
 */
export const zalopayCallback = asyncHandler(async (req, res) => {
  console.log('\n📥 [ZaloPay Callback] Nhận thông báo từ ZaloPay Server');
  try {
    const result = await paymentService.processZalopayCallback(req.body);
    return res.json(result);
  } catch (error) {
    return res.json({ return_code: 0, return_message: error.message });
  }
});

/**
 * 💳 Tạo URL/Mã QR thanh toán PayOS (VietQR)
 * POST /api/payment/create_payos_url
 * Body: { orderId }
 */
export const createPayosPaymentUrl = asyncHandler(async (req, res) => {
  console.log('\n📥 [createPayosPaymentUrl] Called');
  const { orderId } = req.body;
  const userId = req.user.id;

  const data = await paymentService.createPayosPaymentUrl(orderId, userId);

  res.status(200).json({
    success: true,
    ...data
  });
});

/**
 * 🔄 PayOS Return URL - User được redirect về đây sau khi thanh toán qua giao diện Web
 * GET /api/payment/payos_return
 */
export const payosReturn = asyncHandler(async (req, res) => {
  console.log('\n🌏 [PayOS Return] Browser redirect gọi vào backend');
  try {
    const result = await paymentService.processPayosReturn(req.query);

    if (result.success) {
      res.send(`
        <!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Thanh toán thành công</title><style>* { margin: 0; padding: 0; box-sizing: border-box; } body { font-family: 'Segoe UI', Arial, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: linear-gradient(135deg, #e8f5e9 0%, #f1f8e9 100%); } .card { background: white; border-radius: 24px; padding: 48px 40px; max-width: 420px; width: 90%; box-shadow: 0 8px 32px rgba(76,175,80,0.15); text-align: center; animation: slideUp 0.4s ease; } @keyframes slideUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } } .circle { width: 96px; height: 96px; background: linear-gradient(135deg, #43e97b, #38f9d7); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 24px; box-shadow: 0 4px 20px rgba(67,233,123,0.4); } .checkmark { font-size: 48px; line-height: 1; } .title { color: #2e7d32; font-size: 26px; font-weight: 700; margin-bottom: 12px; } .message { color: #555; font-size: 16px; line-height: 1.6; margin-bottom: 8px; } .divider { width: 48px; height: 3px; background: linear-gradient(135deg, #43e97b, #38f9d7); border-radius: 2px; margin: 20px auto; } .note { color: #999; font-size: 13px; } .badge { display: inline-block; background: #e8f5e9; color: #2e7d32; font-size: 12px; font-weight: 600; padding: 4px 12px; border-radius: 20px; margin-top: 20px; }</style></head><body><div class="card"><div class="circle"><span class="checkmark">✓</span></div><div class="title">Thanh toán thành công!</div><div class="message">Đơn hàng của bạn đã được xác nhận.</div><div class="divider"></div><div class="note">Vui lòng quay lại ứng dụng.</div><div class="badge">✔ Giao dịch hoàn tất</div></div></body></html>
      `);
    } else {
      res.send(`
        <!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Thanh toán thất bại</title><style>* { margin: 0; padding: 0; box-sizing: border-box; } body { font-family: 'Segoe UI', Arial, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: linear-gradient(135deg, #fce4ec 0%, #fff3e0 100%); } .card { background: white; border-radius: 24px; padding: 48px 40px; max-width: 420px; width: 90%; box-shadow: 0 8px 32px rgba(244,67,54,0.12); text-align: center; animation: slideUp 0.4s ease; } @keyframes slideUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } } .circle { width: 96px; height: 96px; background: linear-gradient(135deg, #ff6b6b, #ff8e53); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 24px; box-shadow: 0 4px 20px rgba(255,107,107,0.4); } .xmark { font-size: 48px; line-height: 1; color: white; } .title { color: #c62828; font-size: 26px; font-weight: 700; margin-bottom: 12px; } .message { color: #555; font-size: 16px; line-height: 1.6; margin-bottom: 8px; } .divider { width: 48px; height: 3px; background: linear-gradient(135deg, #ff6b6b, #ff8e53); border-radius: 2px; margin: 20px auto; } .note { color: #999; font-size: 13px; } .badge { display: inline-block; background: #fce4ec; color: #c62828; font-size: 12px; font-weight: 600; padding: 4px 12px; border-radius: 20px; margin-top: 20px; }</style></head><body><div class="card"><div class="circle"><span class="xmark">✕</span></div><div class="title">Thanh toán thất bại</div><div class="message">Giao dịch bị hủy hoặc lỗi.</div><div class="divider"></div><div class="note">Vui lòng quay lại ứng dụng.</div><div class="badge">✕ Giao dịch thất bại</div></div></body></html>
      `);
    }
  } catch (error) {
    throw new ApiError(500, error.message || 'Lỗi xử lý kết quả thanh toán');
  }
});

/**
 * 📡 PayOS Webhook (Server-to-Server)
 * POST /api/payment/payos_webhook
 */
export const payosWebhook = asyncHandler(async (req, res) => {
  console.log('\n📡 [PayOS Webhook] Nhận webhook thanh toán, tiến hành verify và xếp hàng...');
  try {
    // 1. Xác thực chữ ký số bằng thư viện của PayOS
    const webhookData = paymentService.payos.webhooks.verify(req.body);

    if (webhookData.code === "00" || webhookData.success === true || webhookData.amount > 0) {
      try {
        // 2. Đẩy dữ liệu đã xác thực vào RabbitMQ
        await publishToQueue('payos_payment_queue', webhookData);
        console.log(`📤 [PayOS Webhook] Đã push callback của orderCode: ${webhookData.orderCode} vào queue: payos_payment_queue thành công`);
      } catch (queueError) {
        console.warn('⚠️ [PayOS Webhook] Không thể đẩy vào RabbitMQ, chuyển sang xử lý đồng bộ fallback:', queueError.message);
        // Fallback: Xử lý đồng bộ ngay lập tức để không bỏ lỡ giao dịch
        await paymentService.processPayosWebhookSuccess(
          webhookData,
          `Thanh toán PayOS thành công (xác nhận qua Webhook đồng bộ fallback)`
        );
      }
    }

    // 3. Phản hồi ngay 200 cho PayOS
    return res.status(200).json({ success: true, message: 'Đã nhận và xử lý' });
  } catch (error) {
    console.error('❌ [PayOS Webhook] Lỗi xác thực chữ ký hoặc lỗi xử lý:', error.message);
    // Trả về 500 để PayOS tự động thử lại sau (PayOS hỗ trợ gửi lại webhook nếu thất bại)
    return res.status(500).json({ success: false, message: error.message || 'Lỗi xử lý webhook' });
  }
});