import mongoose from 'mongoose';
import Order from '../models/orderModel.js';
import Product from '../models/productModel.js';
import Voucher from '../models/voucherModel.js';
import User from '../models/userModel.js';

// 📋 Lấy đơn hàng của user với tính năng phân trang
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

// 📦 Lấy chi tiết đơn hàng theo ID
export const getOrderById = async (orderId, userId) => {
  const order = await Order.findById(orderId)

  if (!order) {
    throw new Error('Không tìm thấy đơn hàng')
  }

  // Check if order belongs to user
  if (order.user._id.toString() !== userId) {
    throw new Error('Bạn không có quyền xem đơn hàng này')
  }

  return order
}

// ✨ Tạo đơn hàng mới (Áp dụng Transaction & Atomic Updates)
export const processCreateOrder = async (userId, { orderItems, paymentMethod, userInfo, voucherCode }) => {
  console.log('\n📦 ========== BẮT ĐẦU TẠO ĐƠN HÀNG (SERVICE) ==========')
  // 1. Validate input
  if (!orderItems || orderItems.length === 0) {
    throw new Error('Đơn hàng phải có ít nhất 1 sản phẩm')
  }

  if (!paymentMethod || !['COD', 'VNPay', 'ZaloPay', 'PayOS'].includes(paymentMethod)) {
    throw new Error('Phương thức thanh toán không hợp lệ')
  }

  if (!userInfo || !userInfo.username || !userInfo.address || !userInfo.phoneNumber) {
    throw new Error('Thông tin người nhận không đầy đủ')
  }

  // 2. Get user info
  const user = await User.findById(userId)
  if (!user) {
    throw new Error('Không tìm thấy người dùng')
  }

  // KHỞI TẠO TRANSACTION
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const processedOrderItems = []
    let itemsPrice = 0

    // 3. Process order items và Atomic Update stock
    for (const item of orderItems) {
      const { productId, color, size, quantity } = item

      if (!productId || !color || !size || !quantity) {
        throw new Error('Thông tin sản phẩm không đầy đủ (cần productId, color, size, quantity)')
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
        // Lỗi này xảy ra khi hết kho (không thỏa mãn $gte: quantity) hoặc gửi sai thông tin size/color
        throw new Error(`Sản phẩm ${productId} (${color} - ${size}) không tồn tại, ngưng bán hoặc KHÔNG ĐỦ SỐ LƯỢNG KHO!`);
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
        throw new Error('Mã voucher không hợp lệ, đã hết hạn hoặc hết lượt sử dụng');
      }

      // Check min order amount, nếu lỗi thì Throw Error -> Transaction Rollback -> Lượt Voucher tự phục hồi
      if (itemsPrice < voucher.minOrderAmount) {
        throw new Error(`Đơn hàng tối thiểu ${voucher.minOrderAmount.toLocaleString()}đ để áp dụng voucher này`);
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

    // NẾU CHẠY ĐẾN ĐÂY KHÔNG LỖI -> COMMIT
    await session.commitTransaction(); 
    console.log(`✅ ========== ĐẶT HÀNG THÀNH CÔNG ==========`)

    return { order, itemsPrice, shippingPrice, voucherData, totalPrice };

  } catch (error) {
    // CÓ BẤT KỲ LỖI NÀO (KỂ CẢ THROW) -> ROLLBACK
    console.log(`❌ Rollback Transaction vì lỗi: ${error.message}`)
    await session.abortTransaction(); 
    throw error;
  } finally {
    session.endSession();
  }
}

// ✅ Xác nhận đã nhận hàng
export const processConfirmReceived = async (orderId, userId) => {
  const order = await Order.findById(orderId)

  if (!order) {
    throw new Error('Không tìm thấy đơn hàng')
  }

  if (order.user.toString() !== userId) {
    throw new Error('Bạn không có quyền xác nhận đơn hàng này')
  }

  const confirmableStatuses = 'Đã giao'
  if (order.status !== confirmableStatuses) {
    throw new Error(`Không thể xác nhận nhận hàng ở trạng thái "${order.status}"`)
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

// ❌ Hủy đơn hàng (Hoàn kho bằng Transaction & Atomic)
export const processCancelOrder = async (orderId, userId) => {
  const order = await Order.findById(orderId)

  if (!order) {
    throw new Error('Không tìm thấy đơn hàng');
  }

  if (order.user.toString() !== userId) {
    throw new Error('Bạn không có quyền hủy đơn hàng này')
  }

  const cancellableStatuses = ['Chờ xác nhận', 'Đã xác nhận']
  if (!cancellableStatuses.includes(order.status)) {
    throw new Error(`Không thể hủy đơn hàng ở trạng thái "${order.status}"`)
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Hoàn trả tồn kho bằng Atomic Updates
    for (const item of order.orderItems) {
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

    order.status = 'Đã hủy';
    await order.save({ session }); // Lưu trạng thái Hủy trong transaction

    await session.commitTransaction();
    return order;

  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}
