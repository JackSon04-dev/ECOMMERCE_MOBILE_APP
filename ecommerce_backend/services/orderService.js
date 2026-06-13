import mongoose from 'mongoose';
import Order from '../models/orderModel.js';
import Product from '../models/productModel.js';
import Voucher from '../models/voucherModel.js';
import User from '../models/userModel.js';
import { ApiError } from '../middleware/errorMiddleware.js';
import redisClient from '../config/redis.js';
import { publishToQueue } from './rabbitmqService.js';

/**
 * 🔄 Retry helper dành riêng cho MongoDB Transient Transaction Errors.
 * WriteConflict (code 112) xảy ra khi 2 transaction tranh chấp cùng document.
 * MongoDB khuyến nghị retry toàn bộ transaction thay vì throw ngững.
 * @param {Function} txnFn - Hàm async chứa logic transaction, nhận vào session
 * @param {number} maxRetries - Số lần retry tối đa (mặc định 3)
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
 * 📋 Lấy đơn hàng của user với tính năng phân trang
 * @param {string} userId - ID của người dùng sở hữu các đơn hàng
 * @param {object} queryParams - Tham số phân trang và bộ lọc { status, page, limit }
 * @param {string} queryParams.status - Trạng thái đơn hàng cần lọc (hỗ trợ phân tách bằng dấu phẩy)
 * @param {number} queryParams.page - Số trang hiện tại
 * @param {number} queryParams.limit - Số lượng đơn hàng mỗi trang
 * @returns {Promise<object>} Đối tượng chứa danh sách đơn hàng và thông tin phân trang
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

  // Phân trang
  const skip = (parseInt(page) - 1) * parseInt(limit)
  const limitNum = parseInt(limit)

  const orders = await Order.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limitNum)

  // Tổng số đơn hàng để frontend biết giới hạn
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
 * 📦 Lấy chi tiết đơn hàng theo ID
 * @param {string} orderId - ID của đơn hàng cần lấy chi tiết
 * @param {string} userId - ID của người dùng gửi yêu cầu (để kiểm tra quyền xem)
 * @returns {Promise<object>} Đối tượng đơn hàng
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
 * ✨ Khởi chạy tiến trình tạo đơn hàng & Caching vào Redis (dành cho Worker và Sync Fallback)
 */
export const processCreateOrder = async (userId, orderData, orderId) => {
  try {
    const result = await _executeCreateOrder(userId, orderData, orderId);

    // Lưu trạng thái thành công và thông tin cache thanh toán vào Redis
    try {
      await redisClient.setEx(`order_status:${orderId}`, 600, JSON.stringify({ status: 'success' }));

      // Caching dữ liệu đơn hàng nếu là thanh toán online để API tạo QR/Link không phải truy vấn DB
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
      // Lỗi nghiệp vụ (hết kho, sai voucher): Ghi status thất bại để Client biết
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
    // Quăng lỗi ra để nơi gọi (Worker) biết cách xử lý ack/nack
    throw error;
  }
};

/**
 * ✨ Khởi tạo đơn hàng (Đẩy vào Queue hoặc xử lý đồng bộ nếu lỗi)
 */
export const enqueueOrderCreation = async (userId, orderData) => {
  // Sinh trước orderId
  const orderId = new mongoose.Types.ObjectId();

  // Lưu trạng thái processing vào Redis (hạn 10 phút)
  try {
    await redisClient.setEx(`order_status:${orderId}`, 600, JSON.stringify({ status: 'processing', error: null }));
  } catch (redisError) {
    console.error('❌ [enqueueOrderCreation] Lỗi ghi Redis:', redisError.message);
  }

  try {
    // Đẩy vào RabbitMQ
    await publishToQueue('order_creation_queue', { userId, orderData, orderId });
    return {
      success: true,
      statusCode: 202,
      trackingId: orderId,
      message: 'Đơn hàng của bạn đang được xử lý...'
    };
  } catch (queueError) {
    // Fallback: Xử lý đồng bộ trực tiếp nếu RabbitMQ sập
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
 * ✨ Tạo đơn hàng mới (Áp dụng Transaction & Atomic Updates + Retry)
 * @param {string} userId - ID của người dùng mua hàng
 * @param {object} orderData - Dữ liệu đơn hàng gửi lên { orderItems, paymentMethod, userInfo, voucherCode }
 * @param {array} orderData.orderItems - Danh sách sản phẩm mua
 * @param {string} orderData.paymentMethod - Phương thức thanh toán (COD, VNPay...)
 * @param {object} orderData.userInfo - Thông tin người nhận
 * @param {string} orderData.voucherCode - Mã giảm giá áp dụng
 * @returns {Promise<object>} Kết quả tạo đơn hàng gồm thông tin chi tiết và chi phí
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

  // KHỞI CHẠY TRANSACTION VỚI RETRY
  return withRetry(async (session) => {
    const processedOrderItems = []
    let itemsPrice = 0

    // 3. Process order items và Atomic Update stock
    for (const item of orderItems) {
      // productId khớp với field Flutter gửi lên và Joi schema validate
      const { productId, color, size, quantity } = item

      if (!productId || !color || !size || !quantity) {
        throw new ApiError(400, 'Thông tin sản phẩm không đầy đủ (cần productId, color, size, quantity)')
      }

      console.log(`📦 Đang kiểm tra & trừ kho: [${productId}] ${color} - ${size} (Số lượng: ${quantity})`)

      // ATOMIC UPDATE: Trừ kho ngay lập tức. Điều kiện kho phải >= quantity.
      const updatedProduct = await Product.findOneAndUpdate(
        {
          _id: productId,
          isActive: true,
          'colorVariants.color': color,
          'colorVariants.sizes.size': size,
          'colorVariants.sizes.stock': { $gte: quantity } // Chốt chặn Race Condition
        },
        {
          $inc: { 'colorVariants.$[colorIndex].sizes.$[sizeIndex].stock': -quantity }
        },
        {
          session,
          new: true, // Trả về product sau khi đã update
          arrayFilters: [{ 'colorIndex.color': color }, { 'sizeIndex.size': size }]
        }
      );

      if (!updatedProduct) {
        // Lỗi này xảy ra khi hết kho (không thỏa mãn $gte: quantity) hoặc gử sai thông tin size/color
        throw new ApiError(400, `Sản phẩm ${productId} (${color} - ${size}) không tồn tại, ngưng bán hoặc không đủ số lượng kho!`);
      }

      // Tìm lại thông tin variant chính xác từ document mới
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

    // 4. Process voucher bằng Atomic Update (nếu có)
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

      // Check min order amount, nếu lỗi thì Throw Error -> Transaction Rollback -> Lượt Voucher tự phục hồi
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
 * ✅ Xác nhận đã nhận hàng
 * @param {string} orderId - ID của đơn hàng cần xác nhận
 * @param {string} userId - ID của người dùng thực hiện (để check quyền)
 * @returns {Promise<object>} Đơn hàng đã được xác nhận thành công
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
 * ❌ Hủy đơn hàng (Hoàn kho bằng Transaction & Atomic + Retry)
 * @param {string} orderId - ID của đơn hàng cần hủy
 * @param {string} userId - ID của người dùng thực hiện (để check quyền)
 * @returns {Promise<object>} Đơn hàng đã được hủy thành công
 */
export const processCancelOrder = async (orderId, userId) => {
  const order = await Order.findById(orderId)

  if (!order) {
    throw new ApiError(404, 'Không tìm thấy đơn hàng');
  }

  if (order.user.toString() !== userId) {
    throw new ApiError(403, 'Bạn không có quyền hủy đơn hàng này')
  }

  const cancellableStatuses = ['Chờ xác nhận', 'Đã xác nhận']
  if (!cancellableStatuses.includes(order.status)) {
    throw new ApiError(400, `Không thể hủy đơn hàng ở trạng thái "${order.status}"`)
  }

  return withRetry(async (session) => {
    // Phải lấy lại thông tin đơn hàng bên trong session để đảm bảo tính nhất quán dữ liệu
    const sessionOrder = await Order.findById(orderId).session(session);
    if (!sessionOrder) {
      throw new ApiError(404, 'Không tìm thấy đơn hàng');
    }

    if (!cancellableStatuses.includes(sessionOrder.status)) {
      throw new ApiError(400, `Không thể hủy đơn hàng ở trạng thái "${sessionOrder.status}"`);
    }

    // Hoàn trả tồn kho bằng Atomic Updates
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

    sessionOrder.status = 'Đã hủy';
    sessionOrder.statusHistory.push({
      status: 'Đã hủy',
      note: 'Người dùng yêu cầu hủy đơn hàng',
      updatedAt: new Date()
    });
    await sessionOrder.save({ session }); // Lưu trạng thái Hủy trong transaction

    return sessionOrder;
  });
}

/**
 * 🔍 Lấy trạng thái xử lý đơn hàng (Đọc từ Redis Cache / Fallback DB)
 * @param {string} orderId - ID đơn hàng
 * @param {string} userId - ID của người dùng gọi API
 * @returns {Promise<object>} Đối tượng chứa trạng thái { status, message, order }
 */
export const getOrderStatus = async (orderId, userId) => {
  // 1. Kiểm tra trạng thái trong Redis do worker đẩy lên
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

  // 2. Fallback: Nếu không tìm thấy key trong Redis, truy vấn trực tiếp MongoDB
  try {
    // Không import getOrderById thì gọi hàm getOrderById trong file này luôn
    const order = await getOrderById(orderId, userId);
    return { status: 'success', order };
  } catch (dbError) {
    // Nếu chưa có trong DB thì chứng tỏ queue chưa xử lý xong, trả về processing
    return { status: 'processing' };
  }
};
