import * as orderService from '../../services/orderService.js';
import { asyncHandler, ApiError } from '../../middleware/errorMiddleware.js';
import mongoose from 'mongoose';
import redisClient from '../../config/redis.js';
import { publishToQueue } from '../../services/rabbitmqService.js';

// 📋 Lấy đơn hàng của user với tính năng phân trang
export const getMyOrders = asyncHandler(async (req, res) => {
  const userId = req.user.id
  const data = await orderService.getMyOrders(userId, req.query)

  res.status(200).json({
    success: true,
    ...data
  })
});

// 📦 Lấy chi tiết đơn hàng theo ID
export const getOrderById = asyncHandler(async (req, res) => {
  const { id } = req.params
  const userId = req.user.id

  const order = await orderService.getOrderById(id, userId)
  res.status(200).json({
    success: true,
    order
  })
});

// ✨ Tạo đơn hàng mới
export const createOrder = asyncHandler(async (req, res) => {
  const userId = req.user.id
  const orderData = req.body

  // Sinh trước orderId
  const orderId = new mongoose.Types.ObjectId()

  // Lưu trạng thái processing vào Redis (hạn 10 phút)
  try {
    await redisClient.setEx(`order_status:${orderId}`, 600, JSON.stringify({ status: 'processing', error: null }));
  } catch (redisError) {
    console.error('❌ [createOrder] Lỗi ghi Redis:', redisError.message);
  }

  try {
    // Đẩy vào RabbitMQ
    await publishToQueue('order_creation_queue', { userId, orderData, orderId });
    res.status(202).json({
      success: true,
      statusCode: 202,
      trackingId: orderId,
      message: 'Đơn hàng của bạn đang được xử lý...'
    });
  } catch (queueError) {
    // Fallback: Xử lý đồng bộ trực tiếp nếu RabbitMQ sập
    console.warn('⚠️ [createOrder] RabbitMQ lỗi, tự động chuyển sang xử lý đồng bộ:', queueError.message);
    const result = await orderService.processCreateOrder(userId, orderData, orderId);
    
    // Ghi đè trạng thái success vào Redis
    try {
      await redisClient.setEx(`order_status:${orderId}`, 600, JSON.stringify({ status: 'success' }));
    } catch (redisError) {}

    res.status(201).json({
      success: true,
      statusCode: 201,
      message: 'Đặt hàng thành công',
      order: result.order
    });
  }
});

// 🔍 Lấy trạng thái xử lý đơn hàng (Polling)
export const getOrderStatus = asyncHandler(async (req, res) => {
  const { id } = req.params
  const userId = req.user.id

  // 1. Kiểm tra trạng thái trong Redis
  let statusData = null
  try {
    const cachedStatus = await redisClient.get(`order_status:${id}`)
    if (cachedStatus) {
      statusData = JSON.parse(cachedStatus)
    }
  } catch (redisError) {
    console.error('❌ [getOrderStatus] Lỗi đọc Redis:', redisError.message)
  }

  // 2. Phản hồi dựa trên trạng thái
  if (statusData) {
    if (statusData.status === 'success') {
      const order = await orderService.getOrderById(id, userId)
      return res.status(200).json({
        success: true,
        status: 'success',
        order
      })
    }
    if (statusData.status === 'failed') {
      return res.status(200).json({
        success: false,
        status: 'failed',
        message: statusData.error || 'Đặt hàng thất bại'
      })
    }
    return res.status(200).json({
      success: true,
      status: 'processing'
    })
  }

  // 3. Fallback: Nếu không tìm thấy key trong Redis, truy vấn trực tiếp MongoDB
  try {
    const order = await orderService.getOrderById(id, userId)
    return res.status(200).json({
      success: true,
      status: 'success',
      order
    })
  } catch (dbError) {
    return res.status(200).json({
      success: true,
      status: 'processing'
    })
  }
});

// ✅ Xác nhận đã nhận hàng → cập nhật status thành "Thành công"
export const confirmReceived = asyncHandler(async (req, res) => {
  const { id } = req.params
  const userId = req.user.id

  const order = await orderService.processConfirmReceived(id, userId)
  res.status(200).json({
    success: true,
    message: 'Xác nhận nhận hàng thành công',
    order
  })
});

// ❌ Hủy đơn hàng
export const cancelOrder = asyncHandler(async (req, res) => {
  const { id } = req.params
  const userId = req.user.id

  const order = await orderService.processCancelOrder(id, userId)
  res.status(200).json({
    success: true,
    message: 'Hủy đơn hàng thành công',
    order
  })
});

