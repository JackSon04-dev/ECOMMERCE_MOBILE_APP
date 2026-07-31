import Order from '../../models/orderModel.js'
import Product from '../../models/productModel.js'
import User from '../../models/userModel.js'
import Voucher from '../../models/voucherModel.js'
import { asyncHandler, ApiError } from '../../middleware/errorMiddleware.js'

// 1. Financial overview (Overview)
export const getFinancialOverview = asyncHandler(async (req, res) => {
  const now = new Date()

  // Calculate start/end dates of periods
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

  // Function to calculate revenue over a time period
  const getRevenue = async (startDate, endDate) => {
    const orders = await Order.find({
      createdAt: { $gte: startDate, $lte: endDate },
      status: { $in: ['Thành công'] }
    })
    return orders.reduce((sum, order) => sum + order.totalPrice, 0)
  }

  // Calculate period revenues
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

  // Calculate % change
  const calculateChange = (current, previous) => {
    if (previous === 0) return current > 0 ? 100 : 0
    return Math.round(((current - previous) / previous) * 100)
  }

  // Average order value (AOV)
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

// 2. Orders pending confirmation
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

// 3. Top 7 best-selling products
export const getTopProducts = asyncHandler(async (req, res) => {
  const topProducts = await Order.aggregate([
    // Only get successful orders
    { $match: { status: { $in: ['Đã giao', 'Thành công'] } } },
    // Separate orderItems array
    { $unwind: '$orderItems' },
    // Group by product and calculate total sales volume
    {
      $group: {
        _id: '$orderItems.product',
        totalSold: { $sum: '$orderItems.variant.quantity' },
        revenue: { $sum: '$orderItems.itemTotal' },
        productName: { $first: '$orderItems.productName' }
      }
    },
    // Sort by sales volume in descending order
    { $sort: { totalSold: -1 } },
    // Get top 7
    { $limit: 7 },
    // Populate product info
    {
      $lookup: {
        from: 'products',
        localField: '_id',
        foreignField: '_id',
        as: 'productInfo'
      }
    },
    { $unwind: { path: '$productInfo', preserveNullAndEmptyArrays: true } },
    // Format result
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

// 4. Top customers by highest spend
export const getTopCustomers = asyncHandler(async (req, res) => {
  const topCustomers = await Order.aggregate([
    // Only get delivered or successful orders
    { $match: { status: { $in: ['Đã giao', 'Thành công'] } } },
    // Group by user and calculate total spend
    {
      $group: {
        _id: '$user',
        totalSpent: { $sum: '$totalPrice' },
        orderCount: { $sum: 1 }
      }
    },
    // Sort in descending order by total spend
    { $sort: { totalSpent: -1 } },
    // Get top 10
    { $limit: 5 },
    // Populate user info
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'userInfo'
      }
    },
    { $unwind: { path: '$userInfo', preserveNullAndEmptyArrays: true } },
    // Format result
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

// 5. Most used vouchers
export const getTopVouchers = asyncHandler(async (req, res) => {
  const topVouchers = await Order.aggregate([
    // Only get successful orders that used a voucher
    { $match: { 'voucher.voucherId': { $exists: true }, status: { $in: ['Đã giao', 'Thành công'] } } },
    // Group by voucher
    {
      $group: {
        _id: '$voucher.voucherId',
        usageCount: { $sum: 1 },
        totalDiscount: { $sum: '$voucher.discountAmount' },
        voucherCode: { $first: '$voucher.voucherCode' },
        voucherName: { $first: '$voucher.voucherName' }
      }
    },
    // Sort in descending order
    { $sort: { usageCount: -1 } },
    // Get top 5
    { $limit: 5 },
    // Format result
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

// 6. Monthly revenue chart
export const getRevenueChart = asyncHandler(async (req, res) => {
  // Get the oldest order to know which month to start from
  const oldestOrder = await Order.findOne({
    status: { $in: ['Đã giao', 'Thành công'] }
  }).sort({ createdAt: 1 })

  if (!oldestOrder) {
    return res.status(200).json({
      success: true,
      data: []
    })
  }

  // Aggregate revenue by month
  const revenueByMonth = await Order.aggregate([
    // Chỉ lấy đơn thành công
    { $match: { status: { $in: ['Đã giao', 'Thành công'] } } },
    // Group by month and year
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
    // Sort by time
    { $sort: { '_id.year': 1, '_id.month': 1 } },
    // Format result
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

