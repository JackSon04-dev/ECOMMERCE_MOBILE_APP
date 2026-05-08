import { VNPay, ignoreLogger, ProductCode, VnpLocale } from 'vnpay'
import Order from '../../models/orderModel.js'
import CryptoJS from 'crypto-js'
import moment from 'moment'

// Khởi tạo VNPay instance với config từ .env
const vnpay = new VNPay({
  tmnCode: process.env.VNP_TMN_CODE || '0RJMK76I',
  secureSecret: process.env.VNP_HASH_SECRET || 'NX3KIUY74VU8GBKIIHTG08XEZJWX1DBP',
  vnpayHost: 'https://sandbox.vnpayment.vn',
  testMode: true,
  hashAlgorithm: 'SHA512',
  enableLog: true,
  loggerFn: ignoreLogger
})

// Cấu hình ZaloPay Sandbox
const configZaloPay = {
  app_id: process.env.ZALOPAY_APP_ID || "2553",
  key1: process.env.ZALOPAY_KEY1 || "PcY4iZIKFCIdgZvA6ueMcMHHUbRLYjPL",
  key2: process.env.ZALOPAY_KEY2 || "kLtgPl8YESD1cxyKxAMsnD1EaZfXqH4g",
  endpoint: process.env.ZALOPAY_ENDPOINT || "https://sb-openapi.zalopay.vn/v2/create"
};

/**
 * 💳 Tạo URL thanh toán VNPay
 * POST /api/payment/create_payment_url
 * Body: { orderId }
 */
export const createPaymentUrl = async (req, res) => {
  try {
    console.log('\n📥 [createPaymentUrl] Called')
    const { orderId } = req.body
    const userId = req.user.id

    console.log(`💳 [VNPay] Creating payment URL for order: ${orderId}`)

    // 1. Tìm đơn hàng
    const order = await Order.findById(orderId)
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đơn hàng'
      })
    }

    // 2. Kiểm tra quyền
    if (order.user.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền thanh toán đơn hàng này'
      })
    }

    // 3. Kiểm tra đã thanh toán chưa
    if (order.isPaid) {
      return res.status(400).json({
        success: false,
        message: 'Đơn hàng đã được thanh toán'
      })
    }

    // 4. Kiểm tra phương thức thanh toán
    if (order.paymentMethod !== 'VNPay') {
      return res.status(400).json({
        success: false,
        message: 'Đơn hàng không sử dụng phương thức thanh toán VNPay'
      })
    }

    // 5. Tạo VNPay payment URL
    // Ưu tiên: env > FE truyền vào > auto-detect từ request
    // Lưu ý: Android emulator dùng 10.0.2.2, cần đổi thành IP LAN thực
    let baseUrl
    if (process.env.VNP_RETURN_URL) {
      // Đã cấu hình sẵn trong .env
      baseUrl = null
    } else if (req.body.baseUrl) {
      // FE truyền baseUrl (ví dụ: http://192.168.1.5:5000)
      baseUrl = req.body.baseUrl.replace(/\/$/, '')
    } else {
      const protocol = req.protocol
      let host = req.get('host')
      // Nếu là 10.0.2.2 (Android emulator) hoặc localhost → cảnh báo
      if (
        host.includes('10.0.2.2') ||
        host.includes('localhost') ||
        host.includes('127.0.0.1')
      ) {
        console.warn(
          '⚠️ [VNPay] Host là local/emulator IP, VNPay có thể không redirect được!'
        )
        console.warn(
          '   Hãy set VNP_RETURN_URL trong .env hoặc FE truyền baseUrl (IP LAN thực)'
        )
      }
      baseUrl = `${protocol}://${host}`
    }
    const returnUrl =
      process.env.VNP_RETURN_URL || `${baseUrl}/api/payment/vnpay_return`

    // Tạo mã giao dịch unique từ orderId (lấy 8 ký tự cuối + timestamp)
    const txnRef = `${orderId.slice(-8)}_${Date.now()}`

    const paymentUrl = vnpay.buildPaymentUrl({
      vnp_Amount: Math.round(order.totalPrice), 
      vnp_IpAddr: '127.0.0.1', 
      vnp_TxnRef: txnRef,
      vnp_OrderInfo: `Thanh toan don hang ${orderId.slice(-8)}`,
      vnp_OrderType: ProductCode.Other,
      vnp_ReturnUrl: returnUrl,
      vnp_Locale: VnpLocale.VN
    })

    // Lưu txnRef vào order để mapping sau này
    order.vnpayTxnRef = txnRef
    await order.save()

    console.log(`✅ [VNPay] Payment URL created successfully`)
    console.log(`   URL: ${paymentUrl}`) // Thêm log này để kiểm tra link
    console.log(`   TxnRef: ${txnRef}`)
    console.log(`   Amount: ${order.totalPrice}`)

    res.status(200).json({
      success: true,
      paymentUrl,
      txnRef
    })
  } catch (error) {
    console.error('❌ [VNPay] Create payment URL error:', error)
    res.status(500).json({
      success: false,
      message: 'Lỗi khi tạo URL thanh toán',
      error: error.message
    })
  }
}

/**
 * 🔄 VNPay Return URL - User được redirect về đây sau khi thanh toán
 * GET /api/payment/vnpay_return
 */
export const vnpayReturn = async (req, res) => {
  try {
    console.log('\n� [vnpayReturn] Called')
    const result = vnpay.verifyReturnUrl(req.query)

    console.log(`   Verified: ${result.isVerified}`)
    console.log(`   Success: ${result.isSuccess}`)

    if (result.isVerified && result.isSuccess) {
      const txnRef = req.query.vnp_TxnRef
      const order = await Order.findOne({ vnpayTxnRef: txnRef })
      if (order && !order.isPaid) {
        order.isPaid = true
        order.paidAt = new Date()
        order.status = 'Đã xác nhận'
        await order.save()
        console.log(`✅ [VNPay Return] Order ${order._id} marked as paid`)
      } else {
        console.log(
          `✅ [VNPay Return] Payment success for order: ${order?._id} (already paid or not found)`
        )
      }

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
      `)
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
      `)
    }
  } catch (error) {
    console.error('❌ [VNPay Return] Error:', error)
    res.status(500).send('Lỗi xử lý kết quả thanh toán')
  }
}

/**
 * 📡 VNPay IPN (Instant Payment Notification)
 * VNPay server gọi endpoint này để thông báo kết quả thanh toán
 * GET /api/payment/vnpay_ipn
 */
export const vnpayIpn = async (req, res) => {
  try {
    console.log('\n� [vnpayIpn] Called')
    const result = vnpay.verifyIpnCall(req.query)

    console.log(`   Verified: ${result.isVerified}`)
    console.log(`   Success: ${result.isSuccess}`)

    if (!result.isVerified) {
      console.log('❌ [VNPay IPN] Invalid signature')
      return res.json({ RspCode: '97', Message: 'Invalid signature' })
    }

    // Tìm order theo txnRef
    const txnRef = req.query.vnp_TxnRef
    const order = await Order.findOne({ vnpayTxnRef: txnRef })

    if (!order) {
      console.log(`❌ [VNPay IPN] Order not found for txnRef: ${txnRef}`)
      return res.json({ RspCode: '01', Message: 'Order not found' })
    }

    // Kiểm tra số tiền
    const vnpAmount = parseInt(req.query.vnp_Amount) / 100 // VNPay gửi *100
    if (vnpAmount !== order.totalPrice) {
      console.log(
        `❌ [VNPay IPN] Amount mismatch: VNPay=${vnpAmount}, Order=${order.totalPrice}`
      )
      return res.json({ RspCode: '04', Message: 'Amount invalid' })
    }

    // Kiểm tra đã xử lý chưa
    if (order.isPaid) {
      console.log(`⚠️ [VNPay IPN] Order already paid: ${order._id}`)
      return res.json({ RspCode: '02', Message: 'Order already confirmed' })
    }

    if (result.isSuccess) {
      // Thanh toán thành công → cập nhật đơn hàng
      order.isPaid = true
      order.paidAt = new Date()
      order.status = 'Đã xác nhận'
      await order.save()

      console.log(`✅ [VNPay IPN] Order ${order._id} marked as PAID`)
      return res.json({ RspCode: '00', Message: 'Confirm Success' })
    } else {
      console.log(`❌ [VNPay IPN] Payment failed for order: ${order._id}`)
      return res.json({ RspCode: '00', Message: 'Confirm Success' })
    }
  } catch (error) {
    console.error('❌ [VNPay IPN] Error:', error)
    return res.json({ RspCode: '99', Message: 'Unknown error' })
  }
}

/**
 * 🔍 Kiểm tra trạng thái thanh toán của đơn hàng
 * GET /api/payment/status/:orderId
 * Nếu là ZaloPay → chủ động query ZaloPay API để cập nhật DB
 */
export const checkPaymentStatus = async (req, res) => {
  try {
    console.log('\n📥 [checkPaymentStatus] Called')
    const { orderId } = req.params
    const userId = req.user.id

    const order = await Order.findById(orderId)

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đơn hàng'
      })
    }

    if (order.user.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền xem đơn hàng này'
      })
    }

    // ─── Nếu là ZaloPay và chưa thanh toán → chủ động hỏi ZaloPay ───
    if (!order.isPaid && order.paymentMethod === 'ZaloPay' && order.zalopayTransId) {
      try {
        console.log(`🔍 [ZaloPay] Querying order status for app_trans_id: ${order.zalopayTransId}`)

        const postData = {
          app_id: configZaloPay.app_id,
          app_trans_id: order.zalopayTransId,
        }

        // Tạo mac: HmacSHA256("app_id|app_trans_id|key1")
        const dataStr = `${postData.app_id}|${postData.app_trans_id}|${configZaloPay.key1}`
        postData.mac = CryptoJS.HmacSHA256(dataStr, configZaloPay.key1).toString()

        const formData = new URLSearchParams()
        for (const [key, value] of Object.entries(postData)) {
          formData.append(key, value)
        }

        const zpResponse = await fetch(
          'https://sb-openapi.zalopay.vn/v2/query',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: formData.toString()
          }
        )
        const zpData = await zpResponse.json()

        console.log(`📦 [ZaloPay Query] Response:`, zpData)

        // ZaloPay trả về return_code=1 nghĩa là giao dịch thành công
        if (zpData.return_code === 1) {
          order.isPaid = true
          order.paidAt = new Date()
          order.status = 'Đã xác nhận'
          await order.save()
          console.log(`✅ [ZaloPay Query] Đơn hàng ${order._id} cập nhật THÀNH CÔNG từ query!`)
        }
      } catch (zpError) {
        // Nếu lỗi query ZaloPay thì vẫn tiếp tục trả về trạng thái DB hiện tại
        console.error('⚠️ [ZaloPay Query] Lỗi:', zpError.message)
      }
    }

    res.status(200).json({
      success: true,
      isPaid: order.isPaid,
      paymentMethod: order.paymentMethod,
      paidAt: order.paidAt || null
    })
  } catch (error) {
    console.error('❌ [PaymentStatus] Error:', error)
    res.status(500).json({
      success: false,
      message: 'Lỗi khi kiểm tra trạng thái thanh toán'
    })
  }
}

/**
 * 💳 Tạo URL thanh toán ZaloPay
 * POST /api/payment/create_zalopay_url
 * Body: { orderId }
 */
export const createZalopayPaymentUrl = async (req, res) => {
  try {
    console.log('\n📥 [createZalopayPaymentUrl] Called')
    const { orderId } = req.body
    const userId = req.user.id

    console.log(`💳 [ZaloPay] Creating payment URL for order: ${orderId}`)

    const order = await Order.findById(orderId)
    if (!order) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' })
    }

    if (order.user.toString() !== userId) {
      return res.status(403).json({ success: false, message: 'Bạn không có quyền thanh toán' })
    }

    if (order.isPaid) {
      return res.status(400).json({ success: false, message: 'Đơn hàng đã được thanh toán' })
    }

    // Kiểm tra phương thức thanh toán
    if (order.paymentMethod !== 'ZaloPay') {
      return res.status(400).json({
        success: false,
        message: 'Đơn hàng không sử dụng phương thức ZaloPay'
      })
    }

    const transID = Math.floor(Math.random() * 1000000);
    const app_trans_id = `${moment().format('YYMMDD')}_${transID}`;

    order.zalopayTransId = app_trans_id;
    await order.save();

    const orderReq = {
      app_id: configZaloPay.app_id,
      app_trans_id,
      app_user: "ecommerce_user",
      app_time: Date.now(),
      amount: order.totalPrice,
      item: "[]",
      embed_data: "{}",
      description: `Thanh toan DH #${orderId.slice(-8)}`,
    };

    // Tạo mac
    const data = configZaloPay.app_id + "|" + orderReq.app_trans_id + "|" + orderReq.app_user + "|" + orderReq.amount + "|" + orderReq.app_time + "|" + orderReq.embed_data + "|" + orderReq.item;
    orderReq.mac = CryptoJS.HmacSHA256(data, configZaloPay.key1).toString();

    // Gọi lên ZaloPay Server - dùng fetch native
    const formData = new URLSearchParams();
    for (const [key, value] of Object.entries(orderReq)) {
      formData.append(key, value);
    }
    const zpRes = await fetch(configZaloPay.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString()
    });
    const response = await zpRes.json();

    if (response.return_code === 1) {
      console.log(`✅ [ZaloPay] Created URL: ${response.order_url}`)
      res.status(200).json({
        success: true,
        orderUrl: response.order_url,
        zpTransToken: response.zp_trans_token
      })
    } else {
      res.status(400).json({
        success: false,
        message: 'Lỗi từ ZaloPay: ' + response.return_message,
        error: response
      })
    }
  } catch (error) {
    console.error('❌ [ZaloPay] Create payment URL error:', error)
    res.status(500).json({
      success: false,
      message: 'Lỗi khi tạo mã thanh toán ZaloPay',
      error: error.message
    })
  }
}

