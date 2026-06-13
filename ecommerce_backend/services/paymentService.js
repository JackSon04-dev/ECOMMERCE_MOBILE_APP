import { VNPay, ignoreLogger, ProductCode, VnpLocale } from 'vnpay';
import Order from '../models/orderModel.js';
import CryptoJS from 'crypto-js';
import moment from 'moment';
import { PayOS } from '@payos/node';
import { ApiError } from '../middleware/errorMiddleware.js';
import redisClient from '../config/redis.js';
import { publishToQueue } from './rabbitmqService.js';

// Helper lưu cache trạng thái thanh toán siêu tốc cho Polling API
const _cachePaymentSuccess = async (order) => {
  try {
    const paymentCache = {
      isPaid: true,
      paymentMethod: order.paymentMethod,
      paidAt: order.paidAt,
      user: order.user.toString()
    };
    await redisClient.setEx(`payment_status:${order._id}`, 300, JSON.stringify(paymentCache));
  } catch (error) {
    console.error('⚠️ [Redis] Lỗi lưu cache trạng thái thanh toán:', error.message);
  }
};

// Helper đọc dữ liệu đơn hàng từ Redis (hoặc DB nếu Cache Miss)
const _getOrderForPaymentCreation = async (orderId, providerName) => {
  let order = null;

  try {
    const cached = await redisClient.get(`payment_order_data:${orderId}`);
    if (cached) {
      order = JSON.parse(cached);
      console.log(`⚡ [${providerName}] Cache HIT: Lấy dữ liệu đơn hàng từ Redis`);
    }
  } catch (err) {
    console.error(`❌ [${providerName}] Lỗi đọc cache Redis:`, err.message);
  }

  if (!order) {
    order = await Order.findById(orderId);
    if (!order) {
      throw new ApiError(404, 'Không tìm thấy đơn hàng');
    }
  }

  return order;
};

// Khởi tạo PayOS
export const payos = new PayOS({
  clientId: process.env.PAYOS_CLIENT_ID || 'dummy_client_id',
  apiKey: process.env.PAYOS_API_KEY || 'dummy_api_key',
  checksumKey: process.env.PAYOS_CHECKSUM_KEY || 'dummy_checksum_key'
});

// Khởi tạo VNPay instance với config từ .env
const vnpay = new VNPay({
  tmnCode: process.env.VNP_TMN_CODE || '0RJMK76I',
  secureSecret: process.env.VNP_HASH_SECRET || 'NX3KIUY74VU8GBKIIHTG08XEZJWX1DBP',
  vnpayHost: 'https://sandbox.vnpayment.vn',
  testMode: true,
  hashAlgorithm: 'SHA512',
  enableLog: true,
  loggerFn: ignoreLogger
});

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
 * @param {string} orderId - ID của đơn hàng cần thanh toán
 * @param {string} userId - ID của người dùng thực hiện (để kiểm tra quyền)
 * @param {string|null} reqBaseUrl - Base URL của request (để ghép link return dự phòng)
 * @returns {Promise<object>} Đối tượng chứa { paymentUrl, txnRef }
 */
export const createPaymentUrl = async (orderId, userId, reqBaseUrl) => {
  console.log(`💳 [VNPay] Creating payment URL for order: ${orderId}`);

  // 1. Tìm đơn hàng (Thử đọc từ Redis trước)
  const order = await _getOrderForPaymentCreation(orderId, 'VNPay');

  // 2. Kiểm tra quyền
  if (order.user.toString() !== userId) {
    throw new ApiError(403, 'Bạn không có quyền thanh toán đơn hàng này');
  }

  // 3. Kiểm tra đã thanh toán chưa
  if (order.isPaid) {
    throw new ApiError(400, 'Đơn hàng đã được thanh toán');
  }

  // 4. Kiểm tra phương thức thanh toán
  if (order.paymentMethod !== 'VNPay') {
    throw new ApiError(400, 'Đơn hàng không sử dụng phương thức thanh toán VNPay');
  }

  // 5. Tạo VNPay payment URL
  let baseUrl;
  if (process.env.VNP_RETURN_URL) {
    baseUrl = null;
  } else if (reqBaseUrl) {
    baseUrl = reqBaseUrl.replace(/\/$/, '');
  } else {
    throw new ApiError(500, 'Thiếu cấu hình VNP_RETURN_URL hoặc baseUrl');
  }

  const returnUrl = process.env.VNP_RETURN_URL || `${baseUrl}/api/payment/vnpay_return`;

  // Tạo mã giao dịch unique từ orderId (lấy 8 ký tự cuối + timestamp)
  const txnRef = `${orderId.slice(-8)}_${Date.now()}`;

  const paymentUrl = vnpay.buildPaymentUrl({
    vnp_Amount: Math.round(order.totalPrice),
    vnp_IpAddr: '127.0.0.1',
    vnp_TxnRef: txnRef,
    vnp_OrderInfo: `Thanh toan don hang ${orderId.slice(-8)}`,
    vnp_OrderType: ProductCode.Other,
    vnp_ReturnUrl: returnUrl,
    vnp_Locale: VnpLocale.VN
  });

  // Lưu txnRef vào order để mapping sau này
  await Order.updateOne({ _id: orderId }, { $set: { vnpayTxnRef: txnRef } });

  console.log(`✅ [VNPay] Payment URL created successfully: ${txnRef}`);

  return {
    paymentUrl,
    txnRef
  };
};


/**
 * 🔄 VNPay Return URL - Xử lý verify kết quả từ VNPay redirect
 * @param {object} query - Đối tượng query params do VNPay redirect về
 * @returns {Promise<object>} Kết quả kiểm tra { success, order }
 */
export const processVnpayReturn = async (query) => {
  console.log('🌏 [VNPay Return] Verifying redirect query params...');
  const result = vnpay.verifyReturnUrl(query);

  if (result.isVerified && result.isSuccess) {
    const txnRef = query.vnp_TxnRef;
    const order = await Order.findOne({ vnpayTxnRef: txnRef });
    if (order && !order.isPaid) {
      order.isPaid = true;
      order.paidAt = new Date();
      if (order.status === 'Chờ xác nhận') {
        order.status = 'Đã xác nhận';
      }
      order.statusHistory.push({
        status: order.status,
        note: `Thanh toán VNPay thành công (xác nhận qua Browser Return)`,
        updatedAt: new Date()
      });
      await order.save();
      console.log(`✅ [VNPay Return] Order ${order._id} marked as paid`);
      await _cachePaymentSuccess(order);
    }
    return { success: true, order };
  }

  return { success: false };
};

/**
 * 🔍 Kiểm tra trạng thái thanh toán của đơn hàng (có polling ZaloPay / PayOS)
 * @param {string} orderId - ID của đơn hàng cần check trạng thái
 * @param {string} userId - ID của người dùng gửi yêu cầu
 * @returns {Promise<object>} Đối tượng chứa trạng thái thanh toán { isPaid, paymentMethod, paidAt }
 */
export const checkPaymentStatus = async (orderId, userId) => {
  // 0. Ưu tiên kiểm tra cache từ Redis do worker webhook đẩy lên
  try {
    const cachedPayment = await redisClient.get(`payment_status:${orderId}`);
    if (cachedPayment) {
      const paymentData = JSON.parse(cachedPayment);
      if (paymentData.user === userId) {
        console.log(`⚡ [Payment Status] Cache HIT: Lấy trạng thái thanh toán từ Redis cho order: ${orderId}`);
        return {
          isPaid: paymentData.isPaid,
          paymentMethod: paymentData.paymentMethod,
          paidAt: paymentData.paidAt
        };
      }
    }
  } catch (redisError) {
    console.error('❌ [checkPaymentStatus] Lỗi đọc Redis:', redisError.message);
  }

  const order = await Order.findById(orderId);

  if (!order) {
    throw new ApiError(404, 'Không tìm thấy đơn hàng');
  }

  if (order.user.toString() !== userId) {
    throw new ApiError(403, 'Bạn không có quyền xem đơn hàng này');
  }

  // ─── Nếu là VNPay và chưa thanh toán → chủ động hỏi VNPay ───
  if (!order.isPaid && order.paymentMethod === 'VNPay' && order.vnpayTxnRef) {
    try {
      console.log(`🔍 [VNPay] Querying order status for txnRef: ${order.vnpayTxnRef}`);
      const parts = order.vnpayTxnRef.split('_');
      const timestamp = parts.length > 1 ? parseInt(parts[1], 10) : order.createdAt.getTime();
      const createDate = Number(moment(timestamp).format('YYYYMMDDHHmmss'));
      const requestId = moment().format('HHmmss') + orderId.slice(-4);

      const vnpData = await vnpay.queryDr({
        vnp_RequestId: requestId,
        vnp_TxnRef: order.vnpayTxnRef,
        vnp_OrderInfo: `Kiem tra trang thai don hang ${orderId.slice(-8)}`,
        vnp_CreateDate: createDate,
        vnp_TransactionDate: createDate,
        vnp_IpAddr: '127.0.0.1',
        vnp_TransactionNo: 0,
      });

      console.log(`📦 [VNPay Query] Status:`, vnpData);

      if (vnpData.isSuccess && vnpData.vnp_TransactionStatus == '00') {
        order.isPaid = true;
        order.paidAt = new Date();
        if (order.status === 'Chờ xác nhận') {
          order.status = 'Đã xác nhận';
        }
        order.statusHistory.push({
          status: order.status,
          note: `Thanh toán VNPay thành công (xác nhận qua polling)`,
          updatedAt: new Date()
        });
        await order.save();
        console.log(`✅ [VNPay Query] Đơn hàng ${order._id} cập nhật THÀNH CÔNG từ query!`);
      }
    } catch (vnpError) {
      console.error('⚠️ [VNPay Query] Lỗi:', vnpError.message);
    }
  }

  // ─── Nếu là ZaloPay và chưa thanh toán → chủ động hỏi ZaloPay ───
  if (!order.isPaid && order.paymentMethod === 'ZaloPay' && order.zalopayTransId) {
    try {
      console.log(`🔍 [ZaloPay] Querying order status for app_trans_id: ${order.zalopayTransId}`);

      const postData = {
        app_id: configZaloPay.app_id,
        app_trans_id: order.zalopayTransId,
      };

      const dataStr = `${postData.app_id}|${postData.app_trans_id}|${configZaloPay.key1}`;
      postData.mac = CryptoJS.HmacSHA256(dataStr, configZaloPay.key1).toString();

      const formData = new URLSearchParams();
      for (const [key, value] of Object.entries(postData)) {
        formData.append(key, value);
      }

      const zpResponse = await fetch(
        'https://sb-openapi.zalopay.vn/v2/query',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: formData.toString()
        }
      );
      const zpData = await zpResponse.json();

      console.log(`📦 [ZaloPay Query] Response:`, zpData);

      if (zpData.return_code === 1) {
        order.isPaid = true;
        order.paidAt = new Date();
        if (order.status === 'Chờ xác nhận') {
          order.status = 'Đã xác nhận';
        }
        order.statusHistory.push({
          status: order.status,
          note: `Thanh toán ZaloPay thành công (xác nhận qua polling)`,
          updatedAt: new Date()
        });
        await order.save();
        console.log(`✅ [ZaloPay Query] Đơn hàng ${order._id} cập nhật THÀNH CÔNG từ query!`);
      }
    } catch (zpError) {
      console.error('⚠️ [ZaloPay Query] Lỗi:', zpError.message);
    }
  }

  // ─── Nếu là PayOS và chưa thanh toán → chủ động hỏi PayOS ───
  if (!order.isPaid && order.paymentMethod === 'PayOS' && order.payosOrderCode) {
    try {
      console.log(`🔍 [PayOS] Querying order status for orderCode: ${order.payosOrderCode}`);
      const paymentLinkData = await payos.paymentRequests.get(order.payosOrderCode);

      console.log(`📦 [PayOS Query] Status: ${paymentLinkData.status}`);

      if (paymentLinkData.status === 'PAID') {
        order.isPaid = true;
        order.paidAt = new Date();
        if (order.status === 'Chờ xác nhận') {
          order.status = 'Đã xác nhận';
        }
        order.statusHistory.push({
          status: order.status,
          note: `Thanh toán PayOS thành công (xác nhận qua polling)`,
          updatedAt: new Date()
        });
        await order.save();
        console.log(`✅ [PayOS Query] Đơn hàng ${order._id} cập nhật THÀNH CÔNG từ query!`);
      }
    } catch (payosError) {
      console.error('⚠️ [PayOS Query] Lỗi:', payosError.message);
    }
  }

  return {
    isPaid: order.isPaid,
    paymentMethod: order.paymentMethod,
    paidAt: order.paidAt || null
  };
};

/**
 * 💳 Tạo URL thanh toán ZaloPay
 * @param {string} orderId - ID của đơn hàng cần thanh toán
 * @param {string} userId - ID của người dùng thực hiện
 * @returns {Promise<object>} Đối tượng kết quả chứa { orderUrl, zpTransToken }
 */
export const createZalopayPaymentUrl = async (orderId, userId) => {
  console.log(`💳 [ZaloPay] Creating payment URL for order: ${orderId}`);

  // Tìm đơn hàng (Thử đọc từ Redis trước)
  const order = await _getOrderForPaymentCreation(orderId, 'ZaloPay');

  if (order.user.toString() !== userId) {
    throw new ApiError(403, 'Bạn không có quyền thanh toán');
  }

  if (order.isPaid) {
    throw new ApiError(400, 'Đơn hàng đã được thanh toán');
  }

  if (order.paymentMethod !== 'ZaloPay') {
    throw new ApiError(400, 'Đơn hàng không sử dụng phương thức ZaloPay');
  }

  const transID = Math.floor(Math.random() * 1000000);
  const app_trans_id = `${moment().format('YYMMDD')}_${transID}`;

  await Order.updateOne({ _id: orderId }, { $set: { zalopayTransId: app_trans_id } });

  const callbackUrl = configZaloPay.callback_url;
  if (!callbackUrl) {
    console.warn('⚠️ [ZaloPay] ZALOPAY_CALLBACK_URL chưa được cấu hình!');
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

  const data = configZaloPay.app_id + "|" + orderReq.app_trans_id + "|" + orderReq.app_user + "|" + orderReq.amount + "|" + orderReq.app_time + "|" + orderReq.embed_data + "|" + orderReq.item;
  orderReq.mac = CryptoJS.HmacSHA256(data, configZaloPay.key1).toString();

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
    console.log(`✅ [ZaloPay] Created URL: ${response.order_url}`);
    return {
      orderUrl: response.order_url,
      zpTransToken: response.zp_trans_token,
      amount: order.totalPrice
    };
  } else {
    throw new ApiError(502, 'Lỗi từ ZaloPay: ' + response.return_message);
  }
};


/**
 * 💳 Tạo URL/Mã QR thanh toán PayOS (VietQR)
 * @param {string} orderId - ID của đơn hàng cần thanh toán
 * @param {string} userId - ID của người dùng thực hiện
 * @returns {Promise<object>} Đối tượng kết quả chứa link checkoutUrl và thông tin chuyển khoản VietQR
 */
export const createPayosPaymentUrl = async (orderId, userId) => {
  console.log(`💳 [PayOS] Creating payment link for order: ${orderId}`);

  // Tìm đơn hàng (Thử đọc từ Redis trước)
  const order = await _getOrderForPaymentCreation(orderId, 'PayOS');

  if (order.user.toString() !== userId) {
    throw new ApiError(403, 'Bạn không có quyền thanh toán');
  }

  if (order.isPaid) {
    throw new ApiError(400, 'Đơn hàng đã được thanh toán');
  }

  if (order.paymentMethod !== 'PayOS') {
    throw new ApiError(400, 'Đơn hàng không sử dụng phương thức PayOS');
  }

  // PayOS orderCode là số nguyên dương <= 9007199254740991
  const orderCode = Number(String(Date.now()).slice(-6) + Math.floor(Math.random() * 1000).toString().padStart(3, '0'));

  await Order.updateOne({ _id: orderId }, { $set: { payosOrderCode: orderCode.toString() } });

  const returnUrl = process.env.PAYOS_RETURN_URL;
  const cancelUrl = process.env.PAYOS_CANCEL_URL;

  const body = {
    orderCode: orderCode,
    //amount: order.totalPrice, total price thật của order lấy từ database hoặc redis
    amount: 2000, // Ép cứng 2000 VND để test cổng thanh toán PayOS
    description: `Thanh toan DH ${orderCode}`,
    returnUrl: returnUrl,
    cancelUrl: cancelUrl
  };

  const paymentLinkData = await payos.paymentRequests.create(body);

  console.log(`✅ [PayOS] Created URL/QR successfully: ${paymentLinkData.checkoutUrl}`);

  return {
    checkoutUrl: paymentLinkData.checkoutUrl,
    qrCode: paymentLinkData.qrCode,
    bin: paymentLinkData.bin,
    accountNumber: paymentLinkData.accountNumber,
    accountName: paymentLinkData.accountName,
    //amount: paymentLinkData.amount, // Trả về số tiền thực tế từ cổng thanh toán PayOS
    amount: order.totalPrice, // Trả về số tiền THẬT của đơn hàng để giao diện hiển thị đúng
    description: paymentLinkData.description,
    orderCode: paymentLinkData.orderCode
  };
};

/**
 * 🔄 PayOS Return URL
 * CHÚ Ý: URL Return của PayOS không có chữ ký bảo mật (signature).
 * KHÔNG ĐƯỢC cập nhật Database ở đây vì user có thể dễ dàng fake tham số trên URL.
 * Chỉ dùng để render giao diện báo thành công/thất bại cho Web Browser.
 * Database sẽ được cập nhật an toàn qua Webhook (processPayosWebhookSuccess).
 * @param {object} query - Các tham số query string nhận từ redirect của PayOS
 * @returns {Promise<object>} Đối tượng chứa trạng thái { success } để Controller render HTML
 */
export const processPayosReturn = async (query) => {
  const { status, cancel } = query;

  // Chỉ check string để Controller biết đường render UI HTML
  if (status === 'PAID' && cancel === 'false') {
    return { success: true };
  }

  return { success: false };
};

/**
 * 📡 Xử lý cập nhật đơn hàng khi nhận được webhook PayOS thành công
 * @param {object} webhookData - Dữ liệu webhook đã verify từ PayOS
 * @param {string} note - Ghi chú lịch sử trạng thái
 */
export const processPayosWebhookSuccess = async (webhookData, note) => {
  const orderCode = webhookData.orderCode.toString();
  const order = await Order.findOne({ payosOrderCode: orderCode });

  if (!order) {
    throw new ApiError(404, `Không tìm thấy đơn hàng với payosOrderCode: ${orderCode}`);
  }

  // Kiểm tra số tiền thực nhận từ PayOS (Đang cố định 2000đ để test tiền thật)
  if (webhookData.amount !== 2000) {
    throw new ApiError(400, `Số tiền thanh toán không khớp: Nhận=${webhookData.amount}, Yêu cầu=2000`);
  }

  if (order.isPaid) {
    console.log(`⚠️ [PayOS Webhook] Đơn hàng ${order._id} đã được đánh dấu thanh toán trước đó. Bỏ qua.`);
    return order;
  }

  order.isPaid = true;
  order.paidAt = new Date();
  if (order.status === 'Chờ xác nhận') {
    order.status = 'Đã xác nhận';
  }
  order.statusHistory.push({
    status: order.status,
    note: note || `Thanh toán PayOS thành công`,
    updatedAt: new Date()
  });
  await order.save();
  await _cachePaymentSuccess(order);

  return order;
};

/**
 * 📡 Xử lý PayOS Webhook (Verify và đẩy vào RabbitMQ)
 * @param {object} webhookBody - Payload gửi sang từ server PayOS
 */
export const handlePayosWebhookRequest = async (webhookBody) => {
  // 1. Xác thực chữ ký số bằng thư viện của PayOS
  const webhookData = await payos.webhooks.verify(webhookBody);

  if (webhookData.code === "00" || webhookData.success === true || webhookData.amount > 0) {
    try {
      // 2. Đẩy dữ liệu đã xác thực vào RabbitMQ
      await publishToQueue('payos_payment_queue', webhookData);
    } catch (queueError) {
      console.warn('⚠️ [PayOS Webhook] Không thể đẩy vào RabbitMQ, chuyển sang xử lý đồng bộ fallback:', queueError.message);
      // Fallback: Xử lý đồng bộ ngay lập tức để không bỏ lỡ giao dịch
      await processPayosWebhookSuccess(
        webhookData,
        `Thanh toán PayOS thành công (xác nhận qua Webhook đồng bộ fallback)`
      );
    }
  }
  return { success: true, message: 'Đã nhận và xử lý' };
};
