import mongoose from 'mongoose';
import Order from '../models/orderModel.js';
import Product from '../models/productModel.js';
import Voucher from '../models/voucherModel.js';
import User from '../models/userModel.js';
import { ApiError } from '../middleware/errorMiddleware.js';
import redisClient from '../config/redis.js';
import { publishToQueue } from './rabbitmqService.js';

/**
 * 🔄 Retry helper exclusively for MongoDB Transient Transaction Errors.
 * WriteConflict (code 112) occurs when 2 transactions contend for same document.
 * MongoDB recommends retrying entire transaction instead of throwing error.
 * @param {Function} txnFn - Async function containing transaction logic, receives session
 * @param {number} maxRetries - Max retry attempts (default 3)
 */
const withRetry = async (txnFn, maxRetries = 3) => {
  let attempt = 0;
  while (attempt <= maxRetries) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const result = await txnFn(session);
      await session.commitTransaction();
      return result;
    } catch (error) {
      await session.abortTransaction();
      const isTransient =
        error.errorLabels?.includes('TransientTransactionError') ||
        error.code === 112; // WriteConflict
      if (isTransient && attempt < maxRetries) {
        attempt++;
        const backoffMs = 50 * Math.pow(2, attempt); // 100ms, 200ms, 400ms
        console.warn(`⚠️ [Retry] WriteConflict - Thử lại lần ${attempt}/${maxRetries} sau ${backoffMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, backoffMs));
      } else {
        throw error;
      }
    } finally {
      session.endSession();
    }
  }
};

/**
 * 📋 Get user's orders with pagination
 * @param {string} userId - ID of the user who owns the orders
 * @param {object} queryParams - Pagination and filter params { status, page, limit }
 * @param {string} queryParams.status - Order status to filter (supports comma separation)
 * @param {number} queryParams.page - Current page
 * @param {number} queryParams.limit - Orders per page
 * @returns {Promise<object>} Object containing order list and pagination info
 */
export const getMyOrders = async (userId, { status, page = 1, limit = 10 }) => {
  // Build query
  const query = { user: userId }
  if (status) {
    if (status.includes(',')) {
      query.status = { $in: status.split(',') }
    } else {
      query.status = status
    }
  }

  // Pagination
  const skip = (parseInt(page) - 1) * parseInt(limit)
  const limitNum = parseInt(limit)

  const orders = await Order.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limitNum)

  // Total orders so frontend knows the limit
  const total = await Order.countDocuments(query)

  return {
    count: orders.length,
    total,
    page: parseInt(page),
    limit: limitNum,
    orders
  }
}

/**
 * 📦 Get order details by ID
 * @param {string} orderId - ID of order to get details
 * @param {string} userId - ID of user sending request (to check view permission)
 * @returns {Promise<object>} Order object
 */
export const getOrderById = async (orderId, userId) => {
  const order = await Order.findById(orderId)

  if (!order) {
    throw new ApiError(404, 'Không tìm thấy đơn hàng')
  }

  // Check if order belongs to user
  if (order.user.toString() !== userId) {
    throw new ApiError(403, 'Bạn không có quyền xem đơn hàng này')
  }
  return order;
};

/**
 * ✨ Launch order creation process & Caching to Redis (for Worker and Sync Fallback)
 */
export const processCreateOrder = async (userId, orderData, orderId) => {
  try {
    const result = await _executeCreateOrder(userId, orderData, orderId);

    // Save success status and payment cache info to Redis
    try {
      await redisClient.setEx(`order_status:${orderId}`, 600, JSON.stringify({ status: 'success' }));

      // Cache order data if online payment so QR/Link generation API doesn't have to query DB
      const onlinePaymentMethods = ['VNPay', 'ZaloPay', 'PayOS'];
      if (onlinePaymentMethods.includes(result.order.paymentMethod)) {
        const cacheData = {
          _id: result.order._id.toString(),
          user: result.order.user.toString(),
          isPaid: result.order.isPaid,
          paymentMethod: result.order.paymentMethod,
          totalPrice: result.order.totalPrice
        };
        await redisClient.setEx(`payment_order_data:${orderId}`, 300, JSON.stringify(cacheData));
        console.log(`💾 [OrderService] Cached online payment order data in Redis for order: ${orderId}`);
      }
    } catch (redisError) {
      console.error('⚠️ [OrderService] Lỗi lưu cache Redis:', redisError.message);
    }

    return result;
  } catch (error) {
    const isApiError = error.statusCode !== undefined;
    if (isApiError) {
      // Business error (out of stock, invalid voucher): Log fail status so Client knows
      try {
        await redisClient.setEx(
          `order_status:${orderId}`,
          600,
          JSON.stringify({ status: 'failed', error: error.message || 'Đặt hàng thất bại' })
        );
      } catch (redisError) {
        console.error('⚠️ [OrderService] Lỗi ghi nhận thất bại vào Redis:', redisError.message);
      }
    }
    // Throw error so caller (Worker) knows how to handle ack/nack
    throw error;
  }
};

/**
 * ✨ Initialize order (Push to Queue or process synchronously if error)
 */
export const enqueueOrderCreation = async (userId, orderData) => {
  // Pre-generate orderId
  const orderId = new mongoose.Types.ObjectId();

  // Save processing status to Redis (10 minutes TTL)
  try {
    await redisClient.setEx(`order_status:${orderId}`, 600, JSON.stringify({ status: 'processing', error: null }));
  } catch (redisError) {
    console.error('❌ [enqueueOrderCreation] Lỗi ghi Redis:', redisError.message);
  }

  try {
    // Push to RabbitMQ
    await publishToQueue('order_creation_queue', { userId, orderData, orderId });
    return {
      success: true,
      statusCode: 202,
      trackingId: orderId,
      message: 'Đơn hàng của bạn đang được xử lý...'
    };
  } catch (queueError) {
    // Fallback: Process synchronously directly if RabbitMQ is down
    console.warn('⚠️ [enqueueOrderCreation] RabbitMQ lỗi, tự động chuyển sang xử lý đồng bộ:', queueError.message);
    const result = await processCreateOrder(userId, orderData, orderId);

    return {
      success: true,
      statusCode: 201,
      message: 'Đặt hàng thành công',
      order: result.order
    };
  }
};

/**
 * ✨ Create new order (Applies Transaction & Atomic Updates + Retry)
 * @param {string} userId - ID of the buyer
 * @param {object} orderData - Order data sent { orderItems, paymentMethod, userInfo, voucherCode }
 * @param {array} orderData.orderItems - Purchased items list
 * @param {string} orderData.paymentMethod - Payment method (COD, VNPay...)
 * @param {object} orderData.userInfo - Receiver information
 * @param {string} orderData.voucherCode - Applied voucher code
 * @returns {Promise<object>} Order creation result containing details and costs
 */
const _executeCreateOrder = async (userId, { orderItems, paymentMethod, userInfo, voucherCode }, preAllocatedId) => {
  console.log('\n📦 ========== BẮT ĐẦU TẠO ĐƠN HÀNG (SERVICE) ==========')
  // 1. Validate input
  if (!orderItems || orderItems.length === 0) {
    throw new ApiError(400, 'Đơn hàng phải có ít nhất 1 sản phẩm')
  }

  if (!paymentMethod || !['COD', 'VNPay', 'ZaloPay', 'PayOS'].includes(paymentMethod)) {
    throw new ApiError(400, 'Phương thức thanh toán không hợp lệ')
  }

  if (!userInfo || !userInfo.username || !userInfo.address || !userInfo.phoneNumber) {
    throw new ApiError(400, 'Thông tin người nhận không đầy đủ')
  }

  // 2. Get user info
  const user = await User.findById(userId)
  if (!user) {
    throw new ApiError(404, 'Không tìm thấy người dùng')
  }

  // LAUNCH TRANSACTION WITH RETRY
  return withRetry(async (session) => {
    const processedOrderItems = []
    let itemsPrice = 0

    // 3. Process order items and Atomic Update stock
    for (const item of orderItems) {
      // productId matches field sent by Flutter and validated by Joi schema
      const { productId, color, size, quantity } = item

      if (!productId || !color || !size || !quantity) {
        throw new ApiError(400, 'Thông tin sản phẩm không đầy đủ (cần productId, color, size, quantity)')
      }

      console.log(`📦 Đang kiểm tra & trừ kho: [${productId}] ${color} - ${size} (Số lượng: ${quantity})`)

      // ATOMIC UPDATE: Deduct inventory immediately. Condition inventory must be >= quantity.
      const updatedProduct = await Product.findOneAndUpdate(
        {
          _id: productId,
          isActive: true,
          'colorVariants.color': color,
          'colorVariants.sizes.size': size,
          'colorVariants.sizes.stock': { $gte: quantity } // Race Condition safeguard
        },
        {
          $inc: { 'colorVariants.$[colorIndex].sizes.$[sizeIndex].stock': -quantity }
        },
        {
          session,
          new: true, // Return product after updated
          arrayFilters: [{ 'colorIndex.color': color }, { 'sizeIndex.size': size }]
        }
      );

      if (!updatedProduct) {
        // This error occurs when out of stock (fails $gte: quantity) or sent wrong size/color info
        throw new ApiError(400, `Sản phẩm ${productId} (${color} - ${size}) không tồn tại, ngưng bán hoặc không đủ số lượng kho!`);
      }

      // Find exact variant info again from new document
      const colorVariant = updatedProduct.colorVariants.find(v => v.color === color);
      const sizeItem = colorVariant.sizes.find(s => s.size === size);

      const itemTotal = updatedProduct.finalPrice * quantity

      processedOrderItems.push({
        product: productId,
        productName: updatedProduct.name,
        finalPrice: updatedProduct.finalPrice,
        variant: {
          color: colorVariant.color,
          colorImage: colorVariant.images[0] || updatedProduct.thumbnail,
          size: size,
          quantity: quantity
        },
        itemTotal: itemTotal
      })

      itemsPrice += itemTotal
    }

    // 4. Process voucher using Atomic Update (if any)
    let voucherData = { discountAmount: 0 }

    if (voucherCode) {
      const voucher = await Voucher.findOneAndUpdate(
        {
          voucherCode: voucherCode.toUpperCase(),
          isActive: true,
          usageLimit: { $gte: 1 }
        },
        {
          $inc: { usageLimit: -1 }
        },
        { session, new: true }
      );

      if (!voucher) {
        throw new ApiError(400, 'Mã voucher không hợp lệ, đã hết hạn hoặc hết lượt sử dụng');
      }

      // Check min order amount, if error Throw Error -> Transaction Rollback -> Voucher usage auto recovers
      if (itemsPrice < voucher.minOrderAmount) {
        throw new ApiError(400, `Đơn hàng tối thiểu ${voucher.minOrderAmount.toLocaleString()}đ để áp dụng voucher này`);
      }

      voucherData = {
        voucherId: voucher._id,
        voucherCode: voucher.voucherCode,
        voucherName: voucher.voucherName,
        discountAmount: voucher.discountAmount
      }
    }

    // 5. Create order
    const shippingPrice = 20000
    const totalPrice = itemsPrice + shippingPrice - voucherData.discountAmount

    const order = new Order({
      _id: preAllocatedId || new mongoose.Types.ObjectId(),
      user: userId,
      userInfo: {
        username: userInfo.username,
        address: userInfo.address,
        phoneNumber: userInfo.phoneNumber
      },
      orderItems: processedOrderItems,
      paymentMethod,
      itemsPrice,
      shippingPrice,
      voucher: voucherData,
      totalPrice,
      isPaid: false
    })

    await order.save({ session });

    // Update soldCount 
    for (const item of processedOrderItems) {
      await Product.findByIdAndUpdate(
        item.product,
        { $inc: { soldCount: item.variant.quantity } },
        { session }
      )
    }

    console.log(`✅ ========== ĐẶT HÀNG THÀNH CÔNG ==========`)
    return { order, itemsPrice, shippingPrice, voucherData, totalPrice };
  });
}


/**
 * ✅ Confirm order received
 * @param {string} orderId - ID of order to confirm
 * @param {string} userId - ID of user executing (to check permission)
 * @returns {Promise<object>} Order successfully confirmed
 */
export const processConfirmReceived = async (orderId, userId) => {
  const order = await Order.findById(orderId)

  if (!order) {
    throw new ApiError(404, 'Không tìm thấy đơn hàng')
  }

  if (order.user.toString() !== userId) {
    throw new ApiError(403, 'Bạn không có quyền xác nhận đơn hàng này')
  }

  const confirmableStatuses = 'Đã giao'
  if (order.status !== confirmableStatuses) {
    throw new ApiError(400, `Không thể xác nhận nhận hàng ở trạng thái "${order.status}"`)
  }

  order.status = 'Thành công'
  order.statusHistory.push({
    status: 'Thành công',
    note: 'Người dùng đã xác nhận nhận hàng',
    updatedAt: new Date()
  })

  if (!order.isPaid) {
    order.isPaid = true
  }
  if (!order.paidAt) {
    order.paidAt = new Date()
  }

  await order.save()
  return order;
}

/**
 * ❌ Cancel order (Restock via Transaction & Atomic + Retry)
 * @param {string} orderId - ID of order to cancel
 * @param {string} userId - ID of user executing (to check permission)
 * @returns {Promise<object>} Order successfully cancelled
 */
export const processCancelOrder = async (orderId, userId) => {
  const order = await Order.findById(orderId)

  if (!order) {
    throw new ApiError(404, 'Không tìm thấy đơn hàng');
  }

  // If userId is 'SYSTEM', this is a command from Cron Job/Worker, skip permission check
  if (order.user.toString() !== userId && userId !== 'SYSTEM') {
    throw new ApiError(403, 'Bạn không có quyền hủy đơn hàng này')
  }

  const cancellableStatuses = ['Chờ xác nhận', 'Đã xác nhận']
  if (!cancellableStatuses.includes(order.status)) {
    throw new ApiError(400, `Không thể hủy đơn hàng ở trạng thái "${order.status}"`)
  }

  return withRetry(async (session) => {
    // Must retrieve order info inside session to ensure data consistency
    const sessionOrder = await Order.findById(orderId).session(session);
    if (!sessionOrder) {
      throw new ApiError(404, 'Không tìm thấy đơn hàng');
    }

    if (!cancellableStatuses.includes(sessionOrder.status)) {
      throw new ApiError(400, `Không thể hủy đơn hàng ở trạng thái "${sessionOrder.status}"`);
    }

    // Refund inventory via Atomic Updates
    for (const item of sessionOrder.orderItems) {
      await Product.findOneAndUpdate(
        {
          _id: item.product,
          'colorVariants.color': item.variant.color,
          'colorVariants.sizes.size': item.variant.size
        },
        {
          $inc: { 'colorVariants.$[colorIndex].sizes.$[sizeIndex].stock': item.variant.quantity }
        },
        {
          session,
          arrayFilters: [{ 'colorIndex.color': item.variant.color }, { 'sizeIndex.size': item.variant.size }]
        }
      );
    }

    // Refund Voucher usage (If any)
    if (sessionOrder.voucher && sessionOrder.voucher.voucherId) {
      await Voucher.findByIdAndUpdate(
        sessionOrder.voucher.voucherId,
        { $inc: { usageLimit: 1 } },
        { session }
      );
    }

    sessionOrder.status = 'Đã hủy';
    sessionOrder.statusHistory.push({
      status: 'Đã hủy',
      note: 'Người dùng yêu cầu hủy đơn hàng',
      updatedAt: new Date()
    });
    await sessionOrder.save({ session }); // Save Cancel status inside transaction

    return sessionOrder;
  });
}

/**
 * 🔍 Get order processing status (Read from Redis Cache / Fallback DB)
 * @param {string} orderId - Order ID
 * @param {string} userId - ID of user calling API
 * @returns {Promise<object>} Object containing status { status, message, order }
 */
export const getOrderStatus = async (orderId, userId) => {
  // 1. Check status in Redis pushed by worker
  try {
    const cachedStatus = await redisClient.get(`order_status:${orderId}`);
    if (cachedStatus) {
      const statusData = JSON.parse(cachedStatus);
      if (statusData.status === 'success') {
        return { status: 'success' };
      }
      if (statusData.status === 'failed') {
        return { status: 'failed', message: statusData.error || 'Đặt hàng thất bại' };
      }
      return { status: 'processing' };
    }
  } catch (redisError) {
    console.error('❌ [getOrderStatus] Lỗi đọc Redis:', redisError.message);
  }

  // 2. Fallback: If key not found in Redis, query MongoDB directly
  try {
    // Don't import getOrderById, call getOrderById function in this file directly
    const order = await getOrderById(orderId, userId);
    return { status: 'success', order };
  } catch (dbError) {
    // If not in DB yet, queue hasn't finished processing, return processing
    return { status: 'processing' };
  }
};
