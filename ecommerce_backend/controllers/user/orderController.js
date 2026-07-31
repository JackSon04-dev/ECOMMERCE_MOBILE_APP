import * as orderService from '../../services/orderService.js';
import { asyncHandler, ApiError } from '../../middleware/errorMiddleware.js';

// 📋 Get user's orders with pagination
export const getMyOrders = asyncHandler(async (req, res) => {
  const userId = req.user.id
  const data = await orderService.getMyOrders(userId, req.query)

  res.status(200).json({
    success: true,
    ...data
  })
});

// 📦 Get order details by ID
export const getOrderById = asyncHandler(async (req, res) => {
  const { id } = req.params
  const userId = req.user.id

  const order = await orderService.getOrderById(id, userId)
  res.status(200).json({
    success: true,
    order
  })
});

// ✨ Create new order
export const createOrder = asyncHandler(async (req, res) => {
  const userId = req.user.id
  const orderData = req.body

  const result = await orderService.enqueueOrderCreation(userId, orderData);

  res.status(result.statusCode).json({
    success: result.success,
    message: result.message,
    trackingId: result.trackingId,
    order: result.order
  });
});

// 🔍 Get order processing status (Polling)
export const getOrderStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  const result = await orderService.getOrderStatus(id, userId);

  return res.status(200).json({
    success: true,
    ...result
  });
});

// ✅ Confirm received -> update status to "Successful"
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

// ❌ Cancel order
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

