import { VNPay, ignoreLogger, ProductCode, VnpLocale } from 'vnpay'
import Order from '../../models/orderModel.js'
import CryptoJS from 'crypto-js'
import moment from 'moment'
import { PayOS } from '@payos/node'

// Khởi tạo PayOS
const payos = new PayOS({
  clientId: process.env.PAYOS_CLIENT_ID || 'dummy_client_id',
  apiKey: process.env.PAYOS_API_KEY || 'dummy_api_key',
  checksumKey: process.env.PAYOS_CHECKSUM_KEY || 'dummy_checksum_key'
})

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
  endpoint: process.env.ZALOPAY_ENDPOINT || "https://sb-openapi.zalopay.vn/v2/create",
  callback_url: process.env.ZALOPAY_CALLBACK_URL || ""
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
    console.log('\n🌏 [VNPay Return] Browser redirect gọi vào backend')
    console.log(`   → Đây là luồng UX (user thấy kết quả), KHÔNG phải luồng cập nhật DB chính`)
    const result = vnpay.verifyReturnUrl(req.query)

    console.log(`   Verified: ${result.isVerified}`)
    console.log(`   Success: ${result.isSuccess}`)
    console.log(`   TxnRef: ${req.query.vnp_TxnRef}`)
    console.log(`   Amount: ${parseInt(req.query.vnp_Amount || 0) / 100}`)

    if (result.isVerified && result.isSuccess) {
      const txnRef = req.query.vnp_TxnRef
      const order = await Order.findOne({ vnpayTxnRef: txnRef })
      if (order && !order.isPaid) {
        order.isPaid = true
        order.paidAt = new Date()
        if (order.status === 'Chờ xác nhận') {
          order.status = 'Đã xác nhận'
        }
        // Đồng bộ statusHistory (Safety Net: IPN chưa gọi kịp thì Return cập nhật dự phòng)
        order.statusHistory.push({
          status: order.status,
          note: `Thanh toán VNPay thành công (xác nhận qua Browser Return)`,
          updatedAt: new Date()
        })
        await order.save()
        console.log(`✅ [VNPay Return] Order ${order._id} marked as paid`)
      } else {
        console.log(
          `⚠️ [VNPay Return] Đơn ${order?._id} đã được xử lý trước đó (isPaid=true) hoặc không tìm thấy → Bỏ qua`
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
    console.log('\n📡 [VNPay IPN] VNPay SERVER gọi thẳng vào backend (Server-to-Server)')
    console.log(`   → Đây là luồng cập nhật DB chính, đáng tin cậy nhất`)
    const result = vnpay.verifyIpnCall(req.query)

    console.log(`   Verified: ${result.isVerified}`)
    console.log(`   Success: ${result.isSuccess}`)
    console.log(`   TxnRef: ${req.query.vnp_TxnRef}`)
    console.log(`   Amount: ${parseInt(req.query.vnp_Amount || 0) / 100}`)

    if (!result.isVerified) {
      console.log('❌ [VNPay IPN] Chữ ký không hợp lệ! Có thể là request giả mạo.')
      return res.json({ RspCode: '97', Message: 'Invalid signature' })
    }

    // Tìm order theo txnRef
    const txnRef = req.query.vnp_TxnRef
    const order = await Order.findOne({ vnpayTxnRef: txnRef })

    if (!order) {
      console.log(`❌ [VNPay IPN] Không tìm thấy đơn hàng với txnRef: ${txnRef}`)
      return res.json({ RspCode: '01', Message: 'Order not found' })
    }

    // Kiểm tra số tiền
    const vnpAmount = parseInt(req.query.vnp_Amount) / 100 // VNPay gửi *100
    if (vnpAmount !== order.totalPrice) {
      console.log(
        `❌ [VNPay IPN] Số tiền không khớp: VNPay=${vnpAmount}, Đơn hàng=${order.totalPrice}`
      )
      return res.json({ RspCode: '04', Message: 'Amount invalid' })
    }

    // Kiểm tra IDEMPOTENCY - Chống xử lý 2 lần
    if (order.isPaid) {
      console.log(`⚠️ [VNPay IPN] Đơn hàng ${order._id} ĐÃ ĐƯỢC XẬ LÝ TRƯỚC ĐÓ. Bỏ qua.`)
      return res.json({ RspCode: '02', Message: 'Order already confirmed' })
    }

    if (result.isSuccess) {
      // Thanh toán thành công → cập nhật đơn hàng
      order.isPaid = true
      order.paidAt = new Date()
      if (order.status === 'Chờ xác nhận') {
        order.status = 'Đã xác nhận'
      }
      // Đồng bộ statusHistory với zalopayCallback
      order.statusHistory.push({
        status: order.status,
        note: `Thanh toán VNPay thành công (xác nhận qua IPN Server-to-Server)`,
        updatedAt: new Date()
      })
      await order.save()

      console.log(`🎉 [VNPay IPN] Cập nhật THÀNH CÔNG đơn hàng ${order._id} - Số tiền: ${vnpAmount}`)
      return res.json({ RspCode: '00', Message: 'Confirm Success' })
    } else {
      console.log(`❌ [VNPay IPN] Thanh toán thất bại cho đơn hàng: ${order._id}`)
      return res.json({ RspCode: '00', Message: 'Confirm Success' })
    }
  } catch (error) {
    console.error('❌ [VNPay IPN] Lỗi hệ thống:', error)
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
          if (order.status === 'Chờ xác nhận') {
            order.status = 'Đã xác nhận'
          }
          // Đồng bộ với zalopayCallback: ghi lịch sử trạng thái
          order.statusHistory.push({
            status: order.status,
            note: `Thanh toán ZaloPay thành công (xác nhận qua polling)`,
            updatedAt: new Date()
          })
          await order.save()
          console.log(`✅ [ZaloPay Query] Đơn hàng ${order._id} cập nhật THÀNH CÔNG từ query!`)
        }
      } catch (zpError) {
        // Nếu lỗi query ZaloPay thì vẫn tiếp tục trả về trạng thái DB hiện tại
        console.error('⚠️ [ZaloPay Query] Lỗi:', zpError.message)
      }
    }

    // ─── Nếu là PayOS và chưa thanh toán → chủ động hỏi PayOS ───
    if (!order.isPaid && order.paymentMethod === 'PayOS' && order.payosOrderCode) {
      try {
        console.log(`🔍 [PayOS] Querying order status for orderCode: ${order.payosOrderCode}`)
        const paymentLinkData = await payos.getPaymentLinkInformation(order.payosOrderCode)

        console.log(`📦 [PayOS Query] Status: ${paymentLinkData.status}`)

        if (paymentLinkData.status === 'PAID') {
          order.isPaid = true
          order.paidAt = new Date()
          if (order.status === 'Chờ xác nhận') {
            order.status = 'Đã xác nhận'
          }
          order.statusHistory.push({
            status: order.status,
            note: `Thanh toán PayOS thành công (xác nhận qua polling)`,
            updatedAt: new Date()
          })
          await order.save()
          console.log(`✅ [PayOS Query] Đơn hàng ${order._id} cập nhật THÀNH CÔNG từ query!`)
        }
      } catch (payosError) {
        console.error('⚠️ [PayOS Query] Lỗi:', payosError.message)
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

    // callback_url: ZaloPay Server sẽ POST về đây khi user thanh toán xong
    const callbackUrl = configZaloPay.callback_url;
    if (!callbackUrl) {
      console.warn('⚠️ [ZaloPay] ZALOPAY_CALLBACK_URL chưa được cấu hình trong .env!')
    } else {
      console.log(`📡 [ZaloPay] Callback URL: ${callbackUrl}`)
    }

    const orderReq = {
      app_id: configZaloPay.app_id,
      app_trans_id,
      app_user: "ecommerce_user",
      app_time: Date.now(),
      amount: order.totalPrice,
      item: "[]",
      embed_data: JSON.stringify({ callback_url: callbackUrl }),
      description: `Thanh toan DH #${orderId.slice(-8)}`,
      callback_url: callbackUrl,
    };

    // Tạo mac: HmacSHA256("app_id|app_trans_id|app_user|amount|app_time|embed_data|item")
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

/**
 * 📡 ZaloPay Callback (Webhook - Server to Server)
 * ZaloPay Server tự động POST vào đây khi User thanh toán thành công/thất bại.
 * ZaloPay sẽ Retry nếu không nhận được {return_code: 1} trong vòng 15 phút.
 * POST /api/payment/zalopay_callback
 */
export const zalopayCallback = async (req, res) => {
  let result = {}

  try {
    console.log('\n📥 [ZaloPay Callback] Nhận thông báo từ ZaloPay Server')

    const dataStr = req.body.data
    const reqMac = req.body.mac

    // 1. XÁC THỰC CHỮ KÝ (Bảo mật)
    // ZaloPay dùng key2 để ký MAC cho Callback (khác với key1 dùng khi tạo đơn)
    const mac = CryptoJS.HmacSHA256(dataStr, configZaloPay.key2).toString()

    if (reqMac !== mac) {
      console.log('❌ [ZaloPay Callback] Chữ ký MAC không hợp lệ! Có thể là request giả mạo.')
      result.return_code = -1
      result.return_message = 'mac not equal'
      return res.json(result)
    }

    // 2. Giải mã dữ liệu từ ZaloPay
    const dataJson = JSON.parse(dataStr)
    const { app_trans_id, zp_trans_id, amount } = dataJson
    console.log(`✅ [ZaloPay Callback] Chữ ký hợp lệ - app_trans_id: ${app_trans_id}`)

    // 3. Tìm đơn hàng trong DB theo app_trans_id đã lưu lúc tạo đơn
    const order = await Order.findOne({ zalopayTransId: app_trans_id })

    if (!order) {
      console.log(`⚠️ [ZaloPay Callback] Không tìm thấy đơn hàng với app_trans_id: ${app_trans_id}`)
      // Vẫn trả về 1 để ZaloPay không Retry vô ích (không có gì để xử lý)
      result.return_code = 1
      result.return_message = 'order not found but acknowledged'
      return res.json(result)
    }

    // 4. KIỂM TRA IDEMPOTENCY - Chống xử lý 2 lần (double processing)
    if (order.isPaid) {
      console.log(`⚠️ [ZaloPay Callback] Đơn hàng ${order._id} ĐÃ ĐƯỢC XỬ LÝ TRƯỚC ĐÓ. Bỏ qua.`)
      result.return_code = 1
      result.return_message = 'success (already processed)'
      return res.json(result)
    }

    // 5. Cập nhật trạng thái đơn hàng
    order.isPaid = true
    order.paidAt = new Date()
    order.zalopayTransId = zp_trans_id || order.zalopayTransId // Cập nhật ZaloPay transaction ID thực tế
    if (order.status === 'Chờ xác nhận') {
      order.status = 'Đã xác nhận'
    }
    order.statusHistory.push({
      status: order.status,
      note: `Thanh toán ZaloPay thành công (zp_trans_id: ${zp_trans_id})`,
      updatedAt: new Date()
    })
    await order.save()

    console.log(`🎉 [ZaloPay Callback] Cập nhật THÀNH CÔNG đơn hàng ${order._id} - Số tiền: ${amount}`)

    // 6. Báo cáo thành công cho ZaloPay → ZaloPay ngừng Retry
    result.return_code = 1
    result.return_message = 'success'
    return res.json(result)

  } catch (ex) {
    console.error('❌ [ZaloPay Callback] Lỗi hệ thống:', ex.message)
    // Trả về return_code = 0 → ZaloPay sẽ tự động Retry sau ~15 phút
    result.return_code = 0
    result.return_message = ex.message
    return res.json(result)
  }
}

/**
 * 💳 Tạo URL/Mã QR thanh toán PayOS (VietQR)
 * POST /api/payment/create_payos_url
 * Body: { orderId }
 */
export const createPayosPaymentUrl = async (req, res) => {
  try {
    console.log('\n📥 [createPayosPaymentUrl] Called')
    const { orderId } = req.body
    const userId = req.user.id

    console.log(`💳 [PayOS] Creating payment link for order: ${orderId}`)

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

    if (order.paymentMethod !== 'PayOS') {
      return res.status(400).json({
        success: false,
        message: 'Đơn hàng không sử dụng phương thức PayOS'
      })
    }

    // PayOS yêu cầu orderCode là số nguyên dương <= 9007199254740991
    // Lấy 6 số cuối của timestamp + random 3 số
    const orderCode = Number(String(Date.now()).slice(-6) + Math.floor(Math.random() * 1000).toString().padStart(3, '0'));

    order.payosOrderCode = orderCode.toString();
    await order.save();

    const returnUrl = process.env.PAYOS_RETURN_URL || 'https://clothesstores.app/api/payment/payos_return'
    const cancelUrl = process.env.PAYOS_CANCEL_URL || 'https://clothesstores.app/api/payment/payos_return'

    const body = {
      orderCode: orderCode,
      amount: 1000, // FIXME: Đã ép giá 1000 VND để test, DB vẫn giữ order.totalPrice
      description: `Thanh toan DH ${orderCode}`,
      returnUrl: returnUrl,
      cancelUrl: cancelUrl
    };

    const paymentLinkData = await payos.paymentRequests.create(body);

    console.log(`✅ [PayOS] Created URL/QR successfully: ${paymentLinkData.checkoutUrl}`)

    res.status(200).json({
      success: true,
      checkoutUrl: paymentLinkData.checkoutUrl,
      qrCode: paymentLinkData.qrCode, // Dùng để vẽ mã VietQR trên Mobile App
      bin: paymentLinkData.bin,
      accountNumber: paymentLinkData.accountNumber,
      accountName: paymentLinkData.accountName,
      amount: paymentLinkData.amount,
      description: paymentLinkData.description,
      orderCode: paymentLinkData.orderCode
    })
  } catch (error) {
    console.error('❌ [PayOS] Create payment URL error:', error)
    res.status(500).json({
      success: false,
      message: 'Lỗi khi tạo mã thanh toán PayOS',
      error: error.message
    })
  }
}

/**
 * 🔄 PayOS Return URL - User được redirect về đây sau khi thanh toán qua giao diện Web
 * GET /api/payment/payos_return
 */
export const payosReturn = async (req, res) => {
  try {
    console.log('\n🌏 [PayOS Return] Browser redirect gọi vào backend')
    console.log(`   → Đây là luồng UX (user thấy kết quả), KHÔNG phải luồng cập nhật DB chính`)

    const { orderCode, status, cancel } = req.query

    console.log(`   OrderCode: ${orderCode}`)
    console.log(`   Status: ${status}`)
    console.log(`   Cancel: ${cancel}`)

    if (status === 'PAID' && cancel === 'false') {
      const order = await Order.findOne({ payosOrderCode: orderCode })
      if (order && !order.isPaid) {
        order.isPaid = true
        order.paidAt = new Date()
        if (order.status === 'Chờ xác nhận') {
          order.status = 'Đã xác nhận'
        }
        order.statusHistory.push({
          status: order.status,
          note: `Thanh toán PayOS thành công (xác nhận qua Browser Return)`,
          updatedAt: new Date()
        })
        await order.save()
        console.log(`✅ [PayOS Return] Order ${order._id} marked as paid`)
      } else {
        console.log(`⚠️ [PayOS Return] Đơn ${order?._id} đã được xử lý trước đó hoặc không tìm thấy → Bỏ qua`)
      }

      // Trả về giao diện thành công giống VNPay
      res.send(`
        <!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Thanh toán thành công</title><style>* { margin: 0; padding: 0; box-sizing: border-box; } body { font-family: 'Segoe UI', Arial, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: linear-gradient(135deg, #e8f5e9 0%, #f1f8e9 100%); } .card { background: white; border-radius: 24px; padding: 48px 40px; max-width: 420px; width: 90%; box-shadow: 0 8px 32px rgba(76,175,80,0.15); text-align: center; animation: slideUp 0.4s ease; } @keyframes slideUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } } .circle { width: 96px; height: 96px; background: linear-gradient(135deg, #43e97b, #38f9d7); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 24px; box-shadow: 0 4px 20px rgba(67,233,123,0.4); } .checkmark { font-size: 48px; line-height: 1; } .title { color: #2e7d32; font-size: 26px; font-weight: 700; margin-bottom: 12px; } .message { color: #555; font-size: 16px; line-height: 1.6; margin-bottom: 8px; } .divider { width: 48px; height: 3px; background: linear-gradient(135deg, #43e97b, #38f9d7); border-radius: 2px; margin: 20px auto; } .note { color: #999; font-size: 13px; } .badge { display: inline-block; background: #e8f5e9; color: #2e7d32; font-size: 12px; font-weight: 600; padding: 4px 12px; border-radius: 20px; margin-top: 20px; }</style></head><body><div class="card"><div class="circle"><span class="checkmark">✓</span></div><div class="title">Thanh toán thành công!</div><div class="message">Đơn hàng của bạn đã được xác nhận.</div><div class="divider"></div><div class="note">Vui lòng quay lại ứng dụng.</div><div class="badge">✔ Giao dịch hoàn tất</div></div></body></html>
      `)
    } else {
      res.send(`
        <!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Thanh toán thất bại</title><style>* { margin: 0; padding: 0; box-sizing: border-box; } body { font-family: 'Segoe UI', Arial, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: linear-gradient(135deg, #fce4ec 0%, #fff3e0 100%); } .card { background: white; border-radius: 24px; padding: 48px 40px; max-width: 420px; width: 90%; box-shadow: 0 8px 32px rgba(244,67,54,0.12); text-align: center; animation: slideUp 0.4s ease; } @keyframes slideUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } } .circle { width: 96px; height: 96px; background: linear-gradient(135deg, #ff6b6b, #ff8e53); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 24px; box-shadow: 0 4px 20px rgba(255,107,107,0.4); } .xmark { font-size: 48px; line-height: 1; color: white; } .title { color: #c62828; font-size: 26px; font-weight: 700; margin-bottom: 12px; } .message { color: #555; font-size: 16px; line-height: 1.6; margin-bottom: 8px; } .divider { width: 48px; height: 3px; background: linear-gradient(135deg, #ff6b6b, #ff8e53); border-radius: 2px; margin: 20px auto; } .note { color: #999; font-size: 13px; } .badge { display: inline-block; background: #fce4ec; color: #c62828; font-size: 12px; font-weight: 600; padding: 4px 12px; border-radius: 20px; margin-top: 20px; }</style></head><body><div class="card"><div class="circle"><span class="xmark">✕</span></div><div class="title">Thanh toán thất bại</div><div class="message">Giao dịch bị hủy hoặc lỗi.</div><div class="divider"></div><div class="note">Vui lòng quay lại ứng dụng.</div><div class="badge">✕ Giao dịch thất bại</div></div></body></html>
      `)
    }
  } catch (error) {
    console.error('❌ [PayOS Return] Error:', error)
    res.status(500).send('Lỗi xử lý kết quả thanh toán')
  }
}

/**
 * 📡 PayOS Webhook (Server-to-Server)
 * PayOS tự động POST vào đây khi thanh toán thành công
 * POST /api/payment/payos_webhook
 */
export const payosWebhook = async (req, res) => {
  try {
    console.log('\n📡 [PayOS Webhook] PayOS SERVER gọi thẳng vào backend (Server-to-Server)')
    console.log(`   → Đây là luồng cập nhật DB chính, đáng tin cậy nhất`)

    const webhookData = await payos.webhooks.verify(req.body);

    console.log(`   OrderCode: ${webhookData.orderCode}`);
    console.log(`   Amount: ${webhookData.amount}`);

    // Nếu verifyPaymentWebhookData không ném lỗi, chữ ký hợp lệ
    // webhookData là object chứa orderCode, amount, etc.

    // PayOS thường chỉ bắn webhook khi thanh toán thành công (code "00")
    if (webhookData.code === "00" || webhookData.success === true || webhookData.amount > 0) {
      const orderCode = webhookData.orderCode.toString();
      const order = await Order.findOne({ payosOrderCode: orderCode })

      if (!order) {
        console.log(`❌ [PayOS Webhook] Không tìm thấy đơn hàng với orderCode: ${orderCode}`)
        return res.json({ success: true, message: 'Đã nhận nhưng không tìm thấy đơn' })
      }

      // Idempotency
      if (order.isPaid) {
        console.log(`⚠️ [PayOS Webhook] Đơn hàng ${order._id} ĐÃ ĐƯỢC XỬ LÝ TRƯỚC ĐÓ. Bỏ qua.`)
        return res.json({ success: true, message: 'Đã xử lý' })
      }

      order.isPaid = true
      order.paidAt = new Date()
      if (order.status === 'Chờ xác nhận') {
        order.status = 'Đã xác nhận'
      }
      order.statusHistory.push({
        status: order.status,
        note: `Thanh toán PayOS thành công (xác nhận qua Webhook Server-to-Server)`,
        updatedAt: new Date()
      })
      await order.save()

      console.log(`🎉 [PayOS Webhook] Cập nhật THÀNH CÔNG đơn hàng ${order._id}`)
      return res.json({ success: true, message: 'Thành công' })
    }

    return res.json({ success: true })

  } catch (error) {
    console.error('❌ [PayOS Webhook] Lỗi hệ thống hoặc chữ ký sai:', error.message)
    // Trả lỗi 500 để PayOS Retry
    return res.status(500).json({ success: false, message: 'Lỗi xử lý webhook' })
  }
}
