import Order from '../../models/orderModel.js'
import Product from '../../models/productModel.js'
import Voucher from '../../models/voucherModel.js'
import User from '../../models/userModel.js'

// 📋 Lấy đơn hàng của user với tính năng phân trang
export const getMyOrders = async (req, res) => {
  try {
    const userId = req.user.id
    const { status, page = 1, limit = 10 } = req.query

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

    res.status(200).json({
      success: true,
      count: orders.length,
      total,
      page: parseInt(page),
      limit: limitNum,
      orders
    })
  } catch (error) {
    console.error('❌ Get my orders error:', error)
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh sách đơn hàng',
      error: error.message
    })
  }
}

// 📦 Lấy chi tiết đơn hàng theo ID
export const getOrderById = async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user.id

    const order = await Order.findById(id)

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đơn hàng'
      })
    }

    // Check if order belongs to user
    if (order.user._id.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền xem đơn hàng này'
      })
    }

    res.status(200).json({
      success: true,
      order
    })
  } catch (error) {
    console.error('❌ Get order by id error:', error)
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy thông tin đơn hàng',
      error: error.message
    })
  }
}

// ✨ Tạo đơn hàng mới
export const createOrder = async (req, res) => {
  try {
    const userId = req.user.id
    const { orderItems, paymentMethod, userInfo, voucherCode } = req.body

    console.log('\n📦 ========== BẮT ĐẦU TẠO ĐƠN HÀNG ==========')
    console.log(`👤 UserID: ${userId}`)
    console.log(`💳 Payment Method: ${paymentMethod}`)
    console.log(`📝 Order Items Count: ${orderItems?.length || 0}`)
    console.log(`🎫 Voucher Code: ${voucherCode || 'Không có'}`)

    // 1. Validate input
    if (!orderItems || orderItems.length === 0) {
      console.log('❌ Validation failed: Không có sản phẩm trong đơn hàng')
      return res.status(400).json({
        success: false,
        message: 'Đơn hàng phải có ít nhất 1 sản phẩm'
      })
    }

    if (!paymentMethod || !['COD', 'VNPay', 'ZaloPay'].includes(paymentMethod)) {
      return res.status(400).json({
        success: false,
        message: 'Phương thức thanh toán không hợp lệ'
      })
    }

    if (
      !userInfo ||
      !userInfo.username ||
      !userInfo.address ||
      !userInfo.phoneNumber
    ) {
      return res.status(400).json({
        success: false,
        message: 'Thông tin người nhận không đầy đủ'
      })
    }

    // 2. Get user info
    const user = await User.findById(userId)
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy người dùng'
      })
    }

    // 3. Process order items và validate stock
    const processedOrderItems = []
    let itemsPrice = 0

    for (const item of orderItems) {
      const { productId, color, size, quantity } = item

      // Validate required fields
      if (!productId || !color || !size || !quantity) {
        return res.status(400).json({
          success: false,
          message:
            'Thông tin sản phẩm không đầy đủ (cần productId, color, size, quantity)'
        })
      }

      // Find product
      const product = await Product.findById(productId)
      if (!product || !product.isActive) {
        return res.status(400).json({
          success: false,
          message: `Sản phẩm ${productId} không tồn tại hoặc không khả dụng`
        })
      }

      // Find color variant
      const colorVariant = product.colorVariants.find((v) => v.color === color)

      if (!colorVariant) {
        return res.status(400).json({
          success: false,
          message: `Màu ${color} không tồn tại cho sản phẩm ${product.name}`
        })
      }

      // Find size in the color variant
      const sizeItem = colorVariant.sizes.find((s) => s.size === size)

      if (!sizeItem) {
        return res.status(400).json({
          success: false,
          message: `Size ${size} không tồn tại cho màu ${color} của sản phẩm ${product.name}`
        })
      }

      // Check stock
      if (sizeItem.stock < quantity) {
        return res.status(400).json({
          success: false,
          message: `Sản phẩm ${product.name} (${color} - ${size}) không đủ số lượng. Còn lại: ${sizeItem.stock}`
        })
      }

      // Calculate item total
      const itemTotal = product.finalPrice * quantity

      // Create order item
      processedOrderItems.push({
        product: productId,
        productName: product.name,
        finalPrice: product.finalPrice,
        variant: {
          color: colorVariant.color,
          colorImage: colorVariant.images[0] || product.thumbnail,
          size: size,
          quantity: quantity
        },
        itemTotal: itemTotal
      })

      itemsPrice += itemTotal

      // Update stock
      const oldStock = sizeItem.stock
      sizeItem.stock -= quantity
      await product.save()

      console.log(`📦 Trừ stock: [${product.name}] ${color} - ${size}`)
      console.log(`   Stock: ${oldStock} → ${sizeItem.stock} (Trừ ${quantity})`)
    }

    console.log(
      `\n💰 Tổng tiền sản phẩm: ${itemsPrice.toLocaleString('vi-VN')}đ`
    )

    // 4. Process voucher (nếu có)
    let voucherData = {
      discountAmount: 0
    }

    if (voucherCode) {
      const voucher = await Voucher.findOne({
        voucherCode: voucherCode.toUpperCase(),
        isActive: true
      })

      if (!voucher) {
        return res.status(400).json({
          success: false,
          message: 'Mã voucher không hợp lệ hoặc đã hết hạn'
        })
      }

      // Check usage limit
      if (voucher.usageLimit <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Voucher đã hết lượt sử dụng'
        })
      }

      // Check min order amount
      if (itemsPrice < voucher.minOrderAmount) {
        return res.status(400).json({
          success: false,
          message: `Đơn hàng tối thiểu ${voucher.minOrderAmount.toLocaleString()}đ để áp dụng voucher này`
        })
      }

      // Apply voucher
      voucherData = {
        voucherId: voucher._id,
        voucherCode: voucher.voucherCode,
        voucherName: voucher.voucherName,
        discountAmount: voucher.discountAmount
      }

      // Decrease usage limit
      const oldUsageLimit = voucher.usageLimit
      voucher.usageLimit -= 1
      await voucher.save()

      console.log(`\n🎫 Áp dụng voucher thành công:`)
      console.log(`   Code: ${voucher.voucherCode}`)
      console.log(`   Name: ${voucher.voucherName}`)
      console.log(
        `   Discount: ${voucher.discountAmount.toLocaleString('vi-VN')}đ`
      )
      console.log(
        `   Usage Limit: ${oldUsageLimit} → ${voucher.usageLimit} (Trừ 1)`
      )
    }

    // 5. Create order
    const shippingPrice = 20000 // Default shipping price
    const totalPrice = itemsPrice + shippingPrice - voucherData.discountAmount

    const order = new Order({
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
      isPaid: false // Sẽ cập nhật thành true sau khi thanh toán VNPay thành công
    })

    await order.save()

    // 6. Update soldCount for products
    for (const item of processedOrderItems) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { soldCount: item.variant.quantity }
      })
    }

    console.log(`\n✅ ========== ĐẶT HÀNG THÀNH CÔNG ==========`)
    console.log(`📋 Order ID: ${order._id}`)
    console.log(`💰 Tổng tiền: ${totalPrice.toLocaleString('vi-VN')}đ`)
    console.log(`   - Tiền sản phẩm: ${itemsPrice.toLocaleString('vi-VN')}đ`)
    console.log(`   - Phí ship: ${shippingPrice.toLocaleString('vi-VN')}đ`)
    console.log(
      `   - Giảm giá: ${voucherData.discountAmount.toLocaleString('vi-VN')}đ`
    )
    console.log('==========================================\n')

    res.status(201).json({
      success: true,
      message: 'Đặt hàng thành công',
      order
    })
  } catch (error) {
    console.log(`\n❌ ========== TẠO ĐƠN HÀNG THẤT BẠI ==========`)
    console.error('Error:', error.message)
    console.error('Stack:', error.stack)
    console.log('==========================================\n')

    res.status(500).json({
      success: false,
      message: 'Lỗi khi tạo đơn hàng',
      error: error.message
    })
  }
}

// ✅ Xác nhận đã nhận hàng → cập nhật status thành "Thành công"
export const confirmReceived = async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user.id

    console.log(
      `📦 [confirmReceived] Start - OrderID: ${id}, UserID: ${userId}`
    )

    const order = await Order.findById(id)

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đơn hàng'
      })
    }

    // Check if order belongs to user
    if (order.user.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền xác nhận đơn hàng này'
      })
    }

    // Only allow confirm when status is "Đang giao" or "Đã giao"
    const confirmableStatuses =  'Đã giao';
    if (order.status !== confirmableStatuses) {
      return res.status(400).json({
        success: false,
        message: `Không thể xác nhận nhận hàng ở trạng thái "${order.status}"`
      })
    }

    order.status = 'Thành công'

    // Cập nhật trạng thái thanh toán (đặc biệt cho COD)
    if (!order.isPaid) {
      order.isPaid = true
    }
    // Chỉ set paidAt nếu chưa có (tránh ghi đè thời gian thanh toán Banking)
    if (!order.paidAt) {
      order.paidAt = new Date()
    }

    await order.save()

    console.log(
      `✅ [confirmReceived] Success - Order ${id} marked as Thành công, isPaid: ${order.isPaid}`
    )

    res.status(200).json({
      success: true,
      message: 'Xác nhận nhận hàng thành công',
      order
    })
  } catch (error) {
    console.error('❌ [confirmReceived] Error:', error)
    res.status(500).json({
      success: false,
      message: 'Lỗi khi xác nhận nhận hàng',
      error: error.message
    })
  }
}

// ❌ Hủy đơn hàng
export const cancelOrder = async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user.id

    console.log(`🔍 [cancelOrder] Start - OrderID: ${id}, UserID: ${userId}`)

    const order = await Order.findById(id)

    if (!order) {
      console.log(`❌ [cancelOrder] Order not found - OrderID: ${id}`)
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đơn hàng'
      })
    }

    console.log(
      `✅ [cancelOrder] Order found - Status: ${order.status}, Owner: ${order.user.toString()}`
    )

    // Check if order belongs to user
    if (order.user.toString() !== userId) {
      console.log(
        `❌ [cancelOrder] Permission denied - Order owner: ${order.user.toString()}, Request user: ${userId}`
      )
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền hủy đơn hàng này'
      })
    }

    // Check if order can be cancelled
    const cancellableStatuses = ['Chờ xác nhận', 'Đã xác nhận']
    if (!cancellableStatuses.includes(order.status)) {
      console.log(
        `❌ [cancelOrder] Cannot cancel - Current status: ${order.status}`
      )
      return res.status(400).json({
        success: false,
        message: `Không thể hủy đơn hàng ở trạng thái "${order.status}"`
      })
    }

    console.log(
      `📦 [cancelOrder] Restoring stock for ${order.orderItems.length} items...`
    )

    // Restore stock
    for (const item of order.orderItems) {
      console.log(
        `   - Product: ${item.productName}, Color: ${item.variant.color}, Size: ${item.variant.size}, Qty: ${item.variant.quantity}`
      )

      const product = await Product.findById(item.product)
      if (product) {
        // Tìm color variant theo tên màu
        const colorVariant = product.colorVariants.find(
          (cv) => cv.color === item.variant.color
        )

        if (colorVariant) {
          // Tìm size trong color variant
          const sizeItem = colorVariant.sizes.find(
            (s) => s.size === item.variant.size
          )
          if (sizeItem) {
            const oldStock = sizeItem.stock
            sizeItem.stock += item.variant.quantity
            await product.save()
            console.log(`   ✅ Stock restored: ${oldStock} → ${sizeItem.stock}`)
          } else {
            console.log(`   ⚠️  Size not found: ${item.variant.size}`)
          }
        } else {
          console.log(`   ⚠️  Color variant not found: ${item.variant.color}`)
        }
      } else {
        console.log(`   ⚠️  Product not found: ${item.product}`)
      }
    }

    // Update order status
    console.log(`📝 [cancelOrder] Updating order status to 'Đã hủy'...`)
    order.status = 'Đã hủy'
    await order.save()

    console.log(`✅ [cancelOrder] Success - Order ${id} cancelled`)

    res.status(200).json({
      success: true,
      message: 'Hủy đơn hàng thành công',
      order
    })
  } catch (error) {
    console.error('❌ [cancelOrder] Error:', error)
    console.error('Stack trace:', error.stack)
    res.status(500).json({
      success: false,
      message: 'Lỗi khi hủy đơn hàng',
      error: error.message
    })
  }
}
