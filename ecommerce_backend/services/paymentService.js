import { VNPay, ignoreLogger, ProductCode, VnpLocale } from 'vnpay';
import Order from '../models/orderModel.js';
import CryptoJS from 'crypto-js';
import moment from 'moment';
import { PayOS } from '@payos/node';
import { ApiError } from '../middleware/errorMiddleware.js';
import redisClient from '../config/redis.js';
import { publishToQueue } from './rabbitmqService.js';

// Helper to cache super fast payment status for Polling API
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

// Helper to read order data from Redis (or DB on Cache Miss)
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

// Initialize PayOS
export const payos = new PayOS({
  clientId: process.env.PAYOS_CLIENT_ID || 'dummy_client_id',
  apiKey: process.env.PAYOS_API_KEY || 'dummy_api_key',
  checksumKey: process.env.PAYOS_CHECKSUM_KEY || 'dummy_checksum_key'
});

// Initialize VNPay instance with config from .env
const vnpay = new VNPay({
  tmnCode: process.env.VNP_TMN_CODE || '0RJMK76I',
  secureSecret: process.env.VNP_HASH_SECRET || 'NX3KIUY74VU8GBKIIHTG08XEZJWX1DBP',
  vnpayHost: 'https://sandbox.vnpayment.vn',
  testMode: true,
  hashAlgorithm: 'SHA512',
  enableLog: true,
  loggerFn: ignoreLogger
});

// Configure ZaloPay Sandbox
const configZaloPay = {
  app_id: process.env.ZALOPAY_APP_ID || "2553",
  key1: process.env.ZALOPAY_KEY1 || "PcY4iZIKFCIdgZvA6ueMcMHHUbRLYjPL",
  key2: process.env.ZALOPAY_KEY2 || "kLtgPl8YESD1cxyKxAMsnD1EaZfXqH4g",
  endpoint: process.env.ZALOPAY_ENDPOINT || "https://sb-openapi.zalopay.vn/v2/create",
  callback_url: process.env.ZALOPAY_CALLBACK_URL || ""
};

/**
 * 💳 Create VNPay payment URL
 * @param {string} orderId - ID of order to pay
 * @param {string} userId - ID of user executing (to check permission)
 * @param {string|null} reqBaseUrl - Base URL of request (to construct fallback return link)
 * @returns {Promise<object>} Object containing { paymentUrl, txnRef }
 */
export const createPaymentUrl = async (orderId, userId, reqBaseUrl) => {
  console.log(`💳 [VNPay] Creating payment URL for order: ${orderId}`);

  // 1. Find order (Try reading from Redis first)
  const order = await _getOrderForPaymentCreation(orderId, 'VNPay');

  // 2. Check permission
  if (order.user.toString() !== userId) {
    throw new ApiError(403, 'Bạn không có quyền thanh toán đơn hàng này');
  }

  // 3. Check if already paid
  if (order.isPaid) {
    throw new ApiError(400, 'Đơn hàng đã được thanh toán');
  }

  // 4. Check payment method
  if (order.paymentMethod !== 'VNPay') {
    throw new ApiError(400, 'Đơn hàng không sử dụng phương thức thanh toán VNPay');
  }

  // 5. Create VNPay payment URL
  let baseUrl;
  if (process.env.VNP_RETURN_URL) {
    baseUrl = null;
  } else if (reqBaseUrl) {
    baseUrl = reqBaseUrl.replace(/\/$/, '');
  } else {
    throw new ApiError(500, 'Thiếu cấu hình VNP_RETURN_URL hoặc baseUrl');
  }

  const returnUrl = process.env.VNP_RETURN_URL || `${baseUrl}/api/payment/vnpay_return`;

  // Create unique transaction code from orderId (take last 8 chars + timestamp)
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

  // Save txnRef to order for future mapping
  await Order.updateOne({ _id: orderId }, { $set: { vnpayTxnRef: txnRef } });

  console.log(`✅ [VNPay] Payment URL created successfully: ${txnRef}`);

  return {
    paymentUrl,
    txnRef
  };
};


/**
 * 🔄 VNPay Return URL - Process verify result from VNPay redirect
 * @param {object} query - Query params object redirected from VNPay
 * @returns {Promise<object>} Check result { success, order }
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
 * 🔍 Check order payment status (with ZaloPay / PayOS polling)
 * @param {string} orderId - ID of order to check status
 * @param {string} userId - ID of user sending request
 * @returns {Promise<object>} Object containing payment status { isPaid, paymentMethod, paidAt }
 */
export const checkPaymentStatus = async (orderId, userId) => {
  // 0. Prioritize checking cache from Redis pushed by webhook worker
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

  // ─── If VNPay and unpaid → actively query VNPay ───
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

  // ─── If ZaloPay and unpaid → actively query ZaloPay ───
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

  // ─── If PayOS and unpaid → actively query PayOS ───
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
 * 💳 Create ZaloPay payment URL
 * @param {string} orderId - ID of order to pay
 * @param {string} userId - ID of user executing
 * @returns {Promise<object>} Result object containing { orderUrl, zpTransToken }
 */
export const createZalopayPaymentUrl = async (orderId, userId) => {
  console.log(`💳 [ZaloPay] Creating payment URL for order: ${orderId}`);

  // Find order (Try reading from Redis first)
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
 * 💳 Create PayOS payment URL/QR Code (VietQR)
 * @param {string} orderId - ID of order to pay
 * @param {string} userId - ID of user executing
 * @returns {Promise<object>} Result object containing checkoutUrl link and VietQR transfer info
 */
export const createPayosPaymentUrl = async (orderId, userId) => {
  console.log(`💳 [PayOS] Creating payment link for order: ${orderId}`);

  // Find order (Try reading from Redis first)
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

  // PayOS orderCode is a positive integer <= 9007199254740991
  const orderCode = Number(String(Date.now()).slice(-6) + Math.floor(Math.random() * 1000).toString().padStart(3, '0'));

  await Order.updateOne({ _id: orderId }, { $set: { payosOrderCode: orderCode.toString() } });

  const returnUrl = process.env.PAYOS_RETURN_URL;
  const cancelUrl = process.env.PAYOS_CANCEL_URL;

  const body = {
    orderCode: orderCode,
    //amount: order.totalPrice, true total price of order from database or redis
    amount: 2000, // Hardcode 2000 VND to test PayOS payment gateway
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
    //amount: paymentLinkData.amount, // Return actual amount from PayOS payment gateway
    amount: order.totalPrice, // Return TRUE amount of order so UI displays correctly
    description: paymentLinkData.description,
    orderCode: paymentLinkData.orderCode
  };
};

/**
 * 🔄 PayOS Return URL
 * NOTE: PayOS Return URL has no security signature.
 * MUST NOT update Database here because user can easily fake params on URL.
 * Only use to render success/failure UI for Web Browser.
 * Database will be safely updated via Webhook (processPayosWebhookSuccess).
 * @param {object} query - Query string params received from PayOS redirect
 * @returns {Promise<object>} Object containing status { success } for Controller to render HTML
 */
export const processPayosReturn = async (query) => {
  const { status, cancel } = query;

  // Only check string so Controller knows to render HTML UI
  if (status === 'PAID' && cancel === 'false') {
    return { success: true };
  }

  return { success: false };
};

/**
 * 📡 Handle order update on successful PayOS webhook
 * @param {object} webhookData - Verified webhook data from PayOS
 * @param {string} note - Status history note
 */
export const processPayosWebhookSuccess = async (webhookData, note) => {
  const orderCode = webhookData.orderCode.toString();
  const order = await Order.findOne({ payosOrderCode: orderCode });

  if (!order) {
    throw new ApiError(404, `Không tìm thấy đơn hàng với payosOrderCode: ${orderCode}`);
  }

  // Check actual amount received from PayOS (Fixed 2000 VND to test real money)
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
 * 📡 Handle PayOS Webhook (Verify and push to RabbitMQ)
 * @param {object} webhookBody - Payload sent from PayOS server
 */
export const handlePayosWebhookRequest = async (webhookBody) => {
  // 1. Verify digital signature using PayOS library
  const webhookData = await payos.webhooks.verify(webhookBody);

  if (webhookData.code === "00" || webhookData.success === true || webhookData.amount > 0) {
    try {
      // 2. Push verified data to RabbitMQ
      await publishToQueue('payos_payment_queue', webhookData);
    } catch (queueError) {
      console.warn('⚠️ [PayOS Webhook] Không thể đẩy vào RabbitMQ, chuyển sang xử lý đồng bộ fallback:', queueError.message);
      // Fallback: Process synchronously immediately to avoid missing transaction
      await processPayosWebhookSuccess(
        webhookData,
        `Thanh toán PayOS thành công (xác nhận qua Webhook đồng bộ fallback)`
      );
    }
  }
  return { success: true, message: 'Đã nhận và xử lý' };
};
