import { VNPay, ignoreLogger, ProductCode, VnpLocale } from 'vnpay';
import Order from '../models/orderModel.js';
import CryptoJS from 'crypto-js';
import moment from 'moment';
import { PayOS } from '@payos/node';

// Khởi tạo PayOS
const payos = new PayOS({
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

  // 1. Tìm đơn hàng
  const order = await Order.findById(orderId);
  if (!order) {
    throw new Error('Không tìm thấy đơn hàng');
  }

  // 2. Kiểm tra quyền
  if (order.user.toString() !== userId) {
    throw new Error('Bạn không có quyền thanh toán đơn hàng này');
  }

  // 3. Kiểm tra đã thanh toán chưa
  if (order.isPaid) {
    throw new Error('Đơn hàng đã được thanh toán');
  }

  // 4. Kiểm tra phương thức thanh toán
  if (order.paymentMethod !== 'VNPay') {
    throw new Error('Đơn hàng không sử dụng phương thức thanh toán VNPay');
  }

  // 5. Tạo VNPay payment URL
  let baseUrl;
  if (process.env.VNP_RETURN_URL) {
    baseUrl = null;
  } else if (reqBaseUrl) {
    baseUrl = reqBaseUrl.replace(/\/$/, '');
  } else {
    throw new Error('Thiếu cấu hình VNP_RETURN_URL hoặc baseUrl');
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
  order.vnpayTxnRef = txnRef;
  await order.save();

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
    }
    return { success: true, order };
  }

  return { success: false };
};

/**
 * 📡 VNPay IPN - Cập nhật DB từ VNPay IPN gọi trực tiếp
 * @param {object} query - Đối tượng query params do server VNPay gọi sang
 * @returns {Promise<object>} Đối tượng phản hồi VNPay { RspCode, Message }
 */
export const processVnpayIpn = async (query) => {
  const result = vnpay.verifyIpnCall(query);

  if (!result.isVerified) {
    console.log('❌ [VNPay IPN] Chữ ký không hợp lệ!');
    return { RspCode: '97', Message: 'Invalid signature' };
  }

  // Tìm order theo txnRef
  const txnRef = query.vnp_TxnRef;
  const order = await Order.findOne({ vnpayTxnRef: txnRef });

  if (!order) {
    console.log(`❌ [VNPay IPN] Không tìm thấy đơn hàng với txnRef: ${txnRef}`);
    return { RspCode: '01', Message: 'Order not found' };
  }

  // Kiểm tra số tiền
  const vnpAmount = parseInt(query.vnp_Amount) / 100;
  if (vnpAmount !== order.totalPrice) {
    console.log(`❌ [VNPay IPN] Số tiền không khớp: VNPay=${vnpAmount}, Đơn hàng=${order.totalPrice}`);
    return { RspCode: '04', Message: 'Amount invalid' };
  }

  // Kiểm tra IDEMPOTENCY
  if (order.isPaid) {
    console.log(`⚠️ [VNPay IPN] Đơn hàng ${order._id} ĐÃ ĐƯỢC XỬ LÝ TRƯỚC ĐÓ. Bỏ qua.`);
    return { RspCode: '02', Message: 'Order already confirmed' };
  }

  if (result.isSuccess) {
    order.isPaid = true;
    order.paidAt = new Date();
    if (order.status === 'Chờ xác nhận') {
      order.status = 'Đã xác nhận';
    }
    order.statusHistory.push({
      status: order.status,
      note: `Thanh toán VNPay thành công (xác nhận qua IPN Server-to-Server)`,
      updatedAt: new Date()
    });
    await order.save();

    console.log(`🎉 [VNPay IPN] Cập nhật THÀNH CÔNG đơn hàng ${order._id}`);
    return { RspCode: '00', Message: 'Confirm Success' };
  } else {
    console.log(`❌ [VNPay IPN] Giao dịch không thành công cho đơn hàng: ${order._id}`);
    return { RspCode: '00', Message: 'Confirm Success' };
  }
};

/**
 * 🔍 Kiểm tra trạng thái thanh toán của đơn hàng (có polling ZaloPay / PayOS)
 * @param {string} orderId - ID của đơn hàng cần check trạng thái
 * @param {string} userId - ID của người dùng gửi yêu cầu
 * @returns {Promise<object>} Đối tượng chứa trạng thái thanh toán { isPaid, paymentMethod, paidAt }
 */
export const checkPaymentStatus = async (orderId, userId) => {
  const order = await Order.findById(orderId);

  if (!order) {
    throw new Error('Không tìm thấy đơn hàng');
  }

  if (order.user.toString() !== userId) {
    throw new Error('Bạn không có quyền xem đơn hàng này');
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
      const paymentLinkData = await payos.getPaymentLinkInformation(order.payosOrderCode);

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

  const order = await Order.findById(orderId);
  if (!order) {
    throw new Error('Không tìm thấy đơn hàng');
  }

  if (order.user.toString() !== userId) {
    throw new Error('Bạn không có quyền thanh toán');
  }

  if (order.isPaid) {
    throw new Error('Đơn hàng đã được thanh toán');
  }

  if (order.paymentMethod !== 'ZaloPay') {
    throw new Error('Đơn hàng không sử dụng phương thức ZaloPay');
  }

  const transID = Math.floor(Math.random() * 1000000);
  const app_trans_id = `${moment().format('YYMMDD')}_${transID}`;

  order.zalopayTransId = app_trans_id;
  await order.save();

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
      zpTransToken: response.zp_trans_token
    };
  } else {
    throw new Error('Lỗi từ ZaloPay: ' + response.return_message);
  }
};

/**
 * 📡 ZaloPay Callback (Webhook)
 * @param {object} body - Payload gửi sang từ server ZaloPay
 * @returns {Promise<object>} Đối tượng phản hồi ZaloPay { return_code, return_message }
 */
export const processZalopayCallback = async (body) => {
  console.log('📥 [ZaloPay Callback] Processing ZaloPay Webhook callback...');
  const dataStr = body.data;
  const reqMac = body.mac;

  const mac = CryptoJS.HmacSHA256(dataStr, configZaloPay.key2).toString();

  if (reqMac !== mac) {
    console.log('❌ [ZaloPay Callback] MAC invalid!');
    return { return_code: -1, return_message: 'mac not equal' };
  }

  const dataJson = JSON.parse(dataStr);
  const { app_trans_id, zp_trans_id, amount } = dataJson;

  const order = await Order.findOne({ zalopayTransId: app_trans_id });

  if (!order) {
    console.log(`⚠️ [ZaloPay Callback] Order not found: ${app_trans_id}`);
    return { return_code: 1, return_message: 'order not found but acknowledged' };
  }

  if (order.isPaid) {
    console.log(`⚠️ [ZaloPay Callback] Order already processed.`);
    return { return_code: 1, return_message: 'success (already processed)' };
  }

  order.isPaid = true;
  order.paidAt = new Date();
  order.zalopayTransId = zp_trans_id || order.zalopayTransId;
  if (order.status === 'Chờ xác nhận') {
    order.status = 'Đã xác nhận';
  }
  order.statusHistory.push({
    status: order.status,
    note: `Thanh toán ZaloPay thành công (zp_trans_id: ${zp_trans_id})`,
    updatedAt: new Date()
  });
  await order.save();

  console.log(`🎉 [ZaloPay Callback] Cập nhật THÀNH CÔNG đơn hàng ${order._id}`);
  return { return_code: 1, return_message: 'success' };
};

/**
 * 💳 Tạo URL/Mã QR thanh toán PayOS (VietQR)
 * @param {string} orderId - ID của đơn hàng cần thanh toán
 * @param {string} userId - ID của người dùng thực hiện
 * @returns {Promise<object>} Đối tượng kết quả chứa link checkoutUrl và thông tin chuyển khoản VietQR
 */
export const createPayosPaymentUrl = async (orderId, userId) => {
  console.log(`💳 [PayOS] Creating payment link for order: ${orderId}`);

  const order = await Order.findById(orderId);
  if (!order) {
    throw new Error('Không tìm thấy đơn hàng');
  }

  if (order.user.toString() !== userId) {
    throw new Error('Bạn không có quyền thanh toán');
  }

  if (order.isPaid) {
    throw new Error('Đơn hàng đã được thanh toán');
  }

  if (order.paymentMethod !== 'PayOS') {
    throw new Error('Đơn hàng không sử dụng phương thức PayOS');
  }

  // PayOS orderCode là số nguyên dương <= 9007199254740991
  const orderCode = Number(String(Date.now()).slice(-6) + Math.floor(Math.random() * 1000).toString().padStart(3, '0'));

  order.payosOrderCode = orderCode.toString();
  await order.save();

  const returnUrl = process.env.PAYOS_RETURN_URL || 'https://clothesstores.app/api/payment/payos_return';
  const cancelUrl = process.env.PAYOS_CANCEL_URL || 'https://clothesstores.app/api/payment/payos_return';

  const body = {
    orderCode: orderCode,
    amount: 2000, // FIXME: Đã ép giá 2000 VND để test
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
    amount: paymentLinkData.amount,
    description: paymentLinkData.description,
    orderCode: paymentLinkData.orderCode
  };
};

/**
 * 🔄 PayOS Return URL
 * @param {object} query - Các tham số query string nhận từ redirect của PayOS
 * @returns {Promise<object>} Đối tượng chứa trạng thái { success }
 */
export const processPayosReturn = async (query) => {
  const { orderCode, status, cancel } = query;

  if (status === 'PAID' && cancel === 'false') {
    const order = await Order.findOne({ payosOrderCode: orderCode });
    if (order && !order.isPaid) {
      order.isPaid = true;
      order.paidAt = new Date();
      if (order.status === 'Chờ xác nhận') {
        order.status = 'Đã xác nhận';
      }
      order.statusHistory.push({
        status: order.status,
        note: `Thanh toán PayOS thành công (xác nhận qua Browser Return)`,
        updatedAt: new Date()
      });
      await order.save();
      console.log(`✅ [PayOS Return] Order ${order._id} marked as paid`);
    }
    return { success: true };
  }

  return { success: false };
};

/**
 * 📡 PayOS Webhook
 * @param {object} body - Payload body gửi từ server PayOS
 * @returns {Promise<object>} Kết quả phản hồi nhận webhook { success, message }
 */
export const processPayosWebhook = async (body) => {
  const webhookData = await payos.webhooks.verify(body);

  if (webhookData.code === "00" || webhookData.success === true || webhookData.amount > 0) {
    const orderCode = webhookData.orderCode.toString();
    const order = await Order.findOne({ payosOrderCode: orderCode });

    if (!order) {
      console.log(`❌ [PayOS Webhook] Không tìm thấy đơn hàng: ${orderCode}`);
      return { success: true, message: 'Đã nhận nhưng không tìm thấy đơn' };
    }

    if (order.isPaid) {
      console.log(`⚠️ [PayOS Webhook] Đơn hàng ${order._id} ĐÃ ĐƯỢC XỬ LÝ TRƯỚC ĐÓ. Bỏ qua.`);
      return { success: true, message: 'Đã xử lý' };
    }

    order.isPaid = true;
    order.paidAt = new Date();
    if (order.status === 'Chờ xác nhận') {
      order.status = 'Đã xác nhận';
    }
    order.statusHistory.push({
      status: order.status,
      note: `Thanh toán PayOS thành công (xác nhận qua Webhook Server-to-Server)`,
      updatedAt: new Date()
    });
    await order.save();

    console.log(`🎉 [PayOS Webhook] Cập nhật THÀNH CÔNG đơn hàng ${order._id}`);
    return { success: true, message: 'Thành công' };
  }

  return { success: true };
};
