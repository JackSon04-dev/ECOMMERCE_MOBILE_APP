import Order from '../../models/orderModel.js'
import Product from '../../models/productModel.js'
import User from '../../models/userModel.js'
import Voucher from '../../models/voucherModel.js'
import { asyncHandler, ApiError } from '../../middleware/errorMiddleware.js'

// 1. Tổng quan tài chính (Overview)
export const getFinancialOverview = asyncHandler(async (req, res) => {
  const now = new Date()

  // Tính ngày bắt đầu/kết thúc các kỳ
  const todayStart = new Date(now.setHours(0, 0, 0, 0))
  const todayEnd = new Date(now.setHours(23, 59, 59, 999))

  const yesterdayStart = new Date(todayStart)
  yesterdayStart.setDate(yesterdayStart.getDate() - 1)
  const yesterdayEnd = new Date(todayEnd)
  yesterdayEnd.setDate(yesterdayEnd.getDate() - 1)

  const thisWeekStart = new Date(now)
  thisWeekStart.setDate(now.getDate() - now.getDay())
  thisWeekStart.setHours(0, 0, 0, 0)

  const lastWeekStart = new Date(thisWeekStart)
  lastWeekStart.setDate(lastWeekStart.getDate() - 7)
  const lastWeekEnd = new Date(thisWeekStart)
  lastWeekEnd.setMilliseconds(-1)

  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const lastMonthEnd = new Date(
    now.getFullYear(),
    now.getMonth(),
    0,
    23,
    59,
    59
  )

  // Hàm tính doanh thu theo khoảng thời gian
  const getRevenue = async (startDate, endDate) => {
    const orders = await Order.find({
      createdAt: { $gte: startDate, $lte: endDate },
      status: { $in: ['Thành công'] }
    })
    return orders.reduce((sum, order) => sum + order.totalPrice, 0)
  }

  // Tính doanh thu các kỳ
  const [
    todayRevenue,
    yesterdayRevenue,
    thisWeekRevenue,
    lastWeekRevenue,
    thisMonthRevenue,
    lastMonthRevenue
  ] = await Promise.all([
    getRevenue(todayStart, todayEnd),
    getRevenue(yesterdayStart, yesterdayEnd),
    getRevenue(thisWeekStart, new Date()),
    getRevenue(lastWeekStart, lastWeekEnd),
    getRevenue(thisMonthStart, new Date()),
    getRevenue(lastMonthStart, lastMonthEnd)
  ])

  // Tính % thay đổi
  const calculateChange = (current, previous) => {
    if (previous === 0) return current > 0 ? 100 : 0
    return Math.round(((current - previous) / previous) * 100)
  }

  // Giá trị đơn hàng trung bình (AOV)
  const completedOrders = await Order.find({
    status: { $in: ['Đã giao', 'Thành công'] }
  })
  const aov =
    completedOrders.length > 0
      ? Math.round(
          completedOrders.reduce((sum, order) => sum + order.totalPrice, 0) /
            completedOrders.length
        )
      : 0

  res.status(200).json({
    success: true,
    data: {
      revenue: [
        {
          period: 'today',
          value: todayRevenue,
          changePercent: calculateChange(todayRevenue, yesterdayRevenue)
        },
        {
          period: 'thisWeek',
          value: thisWeekRevenue,
          changePercent: calculateChange(thisWeekRevenue, lastWeekRevenue)
        },
        {
          period: 'thisMonth',
          value: thisMonthRevenue,
          changePercent: calculateChange(thisMonthRevenue, lastMonthRevenue)
        }
      ],
      averageOrderValue: aov
    }
  })
});

// 2. Đơn hàng chờ xác nhận
export const getPendingOrders = asyncHandler(async (req, res) => {
  const pendingOrders = await Order.find({ status: 'Chờ xác nhận' })
    .populate('user', 'username email')
    .sort({ createdAt: -1 })

  res.status(200).json({
    success: true,
    count: pendingOrders.length,
    data: pendingOrders
  })
});

// 3. Top 7 sản phẩm bán chạy nhất
export const getTopProducts = asyncHandler(async (req, res) => {
  const topProducts = await Order.aggregate([
    // Chỉ lấy đơn hàng thành công
    { $match: { status: { $in: ['Đã giao', 'Thành công'] } } },
    // Tách mảng orderItems
    { $unwind: '$orderItems' },
    // Nhóm theo sản phẩm và tính tổng số lượng bán
    {
      $group: {
        _id: '$orderItems.product',
        totalSold: { $sum: '$orderItems.variant.quantity' },
        revenue: { $sum: '$orderItems.itemTotal' },
        productName: { $first: '$orderItems.productName' }
      }
    },
    // Sắp xếp theo số lượng bán giảm dần
    { $sort: { totalSold: -1 } },
    // Lấy top 7
    { $limit: 7 },
    // Populate thông tin sản phẩm
    {
      $lookup: {
        from: 'products',
        localField: '_id',
        foreignField: '_id',
        as: 'productInfo'
      }
    },
    { $unwind: { path: '$productInfo', preserveNullAndEmptyArrays: true } },
    // Format kết quả
    {
      $project: {
        _id: 1,
        productName: 1,
        totalSold: 1,
        revenue: 1,
        thumbnail: '$productInfo.thumbnail',
        price: '$productInfo.price',
        finalPrice: '$productInfo.finalPrice'
      }
    }
  ])

  res.status(200).json({
    success: true,
    count: topProducts.length,
    data: topProducts
  })
});

// 4. Top khách hàng chi tiêu nhiều nhất
export const getTopCustomers = asyncHandler(async (req, res) => {
  const topCustomers = await Order.aggregate([
    // Chỉ lấy đơn hàng đã giao hoặc thành công
    { $match: { status: { $in: ['Đã giao', 'Thành công'] } } },
    // Nhóm theo user và tính tổng chi tiêu
    {
      $group: {
        _id: '$user',
        totalSpent: { $sum: '$totalPrice' },
        orderCount: { $sum: 1 }
      }
    },
    // Sắp xếp giảm dần theo tổng chi tiêu
    { $sort: { totalSpent: -1 } },
    // Lấy top 10
    { $limit: 5 },
    // Populate thông tin user
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'userInfo'
      }
    },
    { $unwind: { path: '$userInfo', preserveNullAndEmptyArrays: true } },
    // Format kết quả
    {
      $project: {
        _id: 1,
        username: '$userInfo.username',
        email: '$userInfo.email',
        totalSpent: 1,
        orderCount: 1
      }
    }
  ])

  res.status(200).json({
    success: true,
    count: topCustomers.length,
    data: topCustomers
  })
});

// 5. Voucher được dùng nhiều nhất
export const getTopVouchers = asyncHandler(async (req, res) => {
  const topVouchers = await Order.aggregate([
    // Chỉ lấy đơn thành công có sử dụng voucher
    { $match: { 'voucher.voucherId': { $exists: true }, status: { $in: ['Đã giao', 'Thành công'] } } },
    // Nhóm theo voucher
    {
      $group: {
        _id: '$voucher.voucherId',
        usageCount: { $sum: 1 },
        totalDiscount: { $sum: '$voucher.discountAmount' },
        voucherCode: { $first: '$voucher.voucherCode' },
        voucherName: { $first: '$voucher.voucherName' }
      }
    },
    // Sắp xếp giảm dần
    { $sort: { usageCount: -1 } },
    // Lấy top 5
    { $limit: 5 },
    // Format kết quả
    {
      $project: {
        _id: 1,
        voucherCode: 1,
        voucherName: 1,
        usageCount: 1,
        totalDiscount: 1
      }
    }
  ])

  res.status(200).json({
    success: true,
    count: topVouchers.length,
    data: topVouchers
  })
});

// 6. Biểu đồ doanh thu theo tháng
export const getRevenueChart = asyncHandler(async (req, res) => {
  // Lấy đơn hàng cũ nhất để biết bắt đầu từ tháng nào
  const oldestOrder = await Order.findOne({
    status: { $in: ['Đã giao', 'Thành công'] }
  }).sort({ createdAt: 1 })

  if (!oldestOrder) {
    return res.status(200).json({
      success: true,
      data: []
    })
  }

  // Aggregate doanh thu theo tháng
  const revenueByMonth = await Order.aggregate([
    // Chỉ lấy đơn thành công
    { $match: { status: { $in: ['Đã giao', 'Thành công'] } } },
    // Nhóm theo tháng và năm
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' }
        },
        revenue: { $sum: '$totalPrice' },
        orderCount: { $sum: 1 }
      }
    },
    // Sắp xếp theo thời gian
    { $sort: { '_id.year': 1, '_id.month': 1 } },
    // Format kết quả
    {
      $project: {
        _id: 0,
        year: '$_id.year',
        month: '$_id.month',
        revenue: 1,
        orderCount: 1,
        label: {
          $concat: [
            {
              $toString: '$_id.month'
            },
            '/',
            {
              $toString: '$_id.year'
            }
          ]
        }
      }
    }
  ])

  res.status(200).json({
    success: true,
    count: revenueByMonth.length,
    data: revenueByMonth
  })
});

