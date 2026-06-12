import Cart from '../models/cartModel.js';
import { ApiError } from '../middleware/errorMiddleware.js';

/**
 * 🛒 Lấy giỏ hàng của User và tự động check Stock (Tồn kho thực tế)
 * @param {string} userId
 * @returns {Promise<object>}
 */
export const getCart = async (userId) => {
  // 1. Tìm giỏ hàng hiện tại + Kéo (Populate) data sản phẩm
  let cart = await Cart.findOne({ user: userId }).populate('items.product');

  // Nếu chưa từng có giỏ hàng -> Trả về mảng rỗng theo đúng định dạng
  if (!cart) {
    return {
      cartId: null,
      userId: userId,
      items: [],
      totalItems: 0
    };
  }

  let isModified = false; // Cờ kiểm tra xem có cần update xuống DB không
  let totalItems = 0;
  const formattedItems = [];

  // 2. Chạy vòng lặp kiểm tra Tồn kho
  for (let i = cart.items.length - 1; i >= 0; i--) {
    let item = cart.items[i];
    
    // 🧹 Nếu sản phẩm đã bị xóa khỏi database -> Tự động loại bỏ khỏi giỏ hàng
    if (!item.product) {
      cart.items.splice(i, 1);
      isModified = true;
      continue;
    }

    let currentStock = 0;

    // Lấy tồn kho thực tế tương ứng với Color + Size khách chọn
    const colorVariant = item.product.colorVariants.find(v => v.color === item.color);
    if (colorVariant) {
      const sizeVariant = colorVariant.sizes.find(s => s.size === item.size);
      if (sizeVariant) {
        currentStock = sizeVariant.stock;
      }
    }

    let isOutOfStock = false;
    let finalQuantity = item.quantity;

    // 💥 TH1: Hết hàng hoàn toàn
    if (currentStock === 0) {
      isOutOfStock = true;
    } 
    // ⚠️ TH2: Số lượng trong kho ÍT HƠN số lượng khách yêu cầu
    else if (currentStock < item.quantity) {
      finalQuantity = currentStock; // Tự động giảm xuống số lượng tối đa trong kho
      item.quantity = currentStock; // Sửa trực tiếp Cart Doc để chuẩn bị save DB
      isModified = true;
    }

    // Xây dựng Object cho từng Item trả về cho React/Flutter
    formattedItems.unshift({ // Dùng unshift vì ta lặp ngược mảng
      cartItemId: item._id, // Nếu cần định danh riêng biệt
      product: {
        id: item.product._id,
        name: item.product.name,
        thumbnail: item.product.thumbnail,
        price: item.product.price,
        finalPrice: item.product.finalPrice
      },
      color: item.color,
      size: item.size,
      quantity: finalQuantity,
      stock: currentStock,
      isOutOfStock: isOutOfStock
    });

    // Chỉ cộng vào tổng tiền/số lượng khi HÀNG VẪN CÒN
    if (!isOutOfStock) {
      totalItems += finalQuantity;
    }
  }

  // 3. Nếu DB bị sửa lại do Stock giảm -> Lưu đè lại MongoDB
  if (isModified) {
    await cart.save();
  }

  return {
    cartId: cart._id,
    userId: cart.user,
    updatedAt: cart.updatedAt,
    items: formattedItems,
    totalItems: totalItems
  };
};

/**
 * 🛒 Cập nhật Giỏ hàng (Hỗ trợ đồng bộ Sync mảng Items từ LocalStorage sau 15s hoặc 1 item lẻ)
 * @param {string} userId - ID của người dùng cần cập nhật giỏ hàng
 * @param {object} payload - Dữ liệu payload gửi lên từ client (chứa mảng items hoặc thông tin sản phẩm đơn lẻ)
 * @returns {Promise<boolean>} Trả về true nếu cập nhật thành công
 */
export const updateCart = async (userId, payload) => {
  let itemsToUpdate = [];

  // Hỗ trợ cả đồng bộ mảng hoặc cập nhật lẻ
  if (payload.items && Array.isArray(payload.items)) {
    itemsToUpdate = payload.items;
  } else if (payload.productId) {
    itemsToUpdate = [payload];
  } else {
    throw new ApiError(400, 'Dữ liệu không hợp lệ.');
  }

  // 1. Tìm giỏ hàng hiện tại hoặc tạo mới
  let cart = await Cart.findOne({ user: userId });
  if (!cart) {
    cart = new Cart({ user: userId, items: [] });
  }

  // 2. Chạy vòng lặp merge toàn bộ các item mới vào Cart trên Database
  for (let incomingItem of itemsToUpdate) {
    const { productId, color, size, quantity } = incomingItem;
    if (!productId || !color || !size || quantity === undefined) continue;

    const itemIndex = cart.items.findIndex(
      (item) => item.product.toString() === productId && item.color === color && item.size === size
    );

    if (itemIndex > -1) {
      // Có sẵn -> Cập nhật hoặc Xóa
      if (quantity <= 0) {
        cart.items.splice(itemIndex, 1);
      } else {
        cart.items[itemIndex].quantity = quantity;
      }
    } else {
      // Chưa có -> Thêm mới
      if (quantity > 0) {
        cart.items.push({ product: productId, color, size, quantity });
      }
    }
  }

  cart.updatedAt = Date.now();
  await cart.save();

  return true;
};
