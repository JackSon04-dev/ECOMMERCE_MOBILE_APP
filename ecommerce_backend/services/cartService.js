import Cart from '../models/cartModel.js';
import { ApiError } from '../middleware/errorMiddleware.js';

/**
 * 🛒 Get User's cart and automatically check Stock (Actual inventory)
 * @param {string} userId
 * @returns {Promise<object>}
 */
export const getCart = async (userId) => {
  // 1. Find current cart + Populate product data
  let cart = await Cart.findOne({ user: userId }).populate('items.product');

  // If no cart exists -> Return empty array in correct format
  if (!cart) {
    return {
      cartId: null,
      userId: userId,
      items: [],
      totalItems: 0
    };
  }

  let isModified = false; // Flag to check if DB update is needed
  let totalItems = 0;
  const formattedItems = [];

  // 2. Run loop to check Inventory
  for (let i = cart.items.length - 1; i >= 0; i--) {
    let item = cart.items[i];
    
    // 🧹 If product was deleted from database -> Automatically remove from cart
    if (!item.product) {
      cart.items.splice(i, 1);
      isModified = true;
      continue;
    }

    let currentStock = 0;

    // Get actual inventory matching customer's selected Color + Size
    const colorVariant = item.product.colorVariants.find(v => v.color === item.color);
    if (colorVariant) {
      const sizeVariant = colorVariant.sizes.find(s => s.size === item.size);
      if (sizeVariant) {
        currentStock = sizeVariant.stock;
      }
    }

    let isOutOfStock = false;
    let finalQuantity = item.quantity;

    // 💥 CASE 1: Completely out of stock
    if (currentStock === 0) {
      isOutOfStock = true;
    } 
    // ⚠️ CASE 2: Quantity in stock is LESS THAN requested quantity
    else if (currentStock < item.quantity) {
      finalQuantity = currentStock; // Auto reduce to maximum quantity in stock
      item.quantity = currentStock; // Modify Cart Doc directly to prepare for DB save
      isModified = true;
    }

    // Build Object for each Item returned to React/Flutter
    formattedItems.unshift({ // Use unshift because we iterate array in reverse
      cartItemId: item._id, // If unique identifier is needed
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

    // Only add to total amount/quantity when ITEM IS IN STOCK
    if (!isOutOfStock) {
      totalItems += finalQuantity;
    }
  }

  // 3. If DB was modified due to Stock reduction -> Overwrite MongoDB
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
 * 🛒 Update Cart (Supports syncing Items array from LocalStorage after 15s or 1 single item)
 * @param {string} userId - ID of the user whose cart needs updating
 * @param {object} payload - Payload data sent from client (contains items array or single product info)
 * @returns {Promise<boolean>} Returns true if update successful
 */
export const updateCart = async (userId, payload) => {
  let itemsToUpdate = [];

  // Supports both array sync or single update
  if (payload.items && Array.isArray(payload.items)) {
    itemsToUpdate = payload.items;
  } else if (payload.productId) {
    itemsToUpdate = [payload];
  } else {
    throw new ApiError(400, 'Dữ liệu không hợp lệ.');
  }

  // 1. Find current cart or create new
  let cart = await Cart.findOne({ user: userId });
  if (!cart) {
    cart = new Cart({ user: userId, items: [] });
  }

  // 2. Run loop to merge all new items into Cart on Database
  for (let incomingItem of itemsToUpdate) {
    const { productId, color, size, quantity } = incomingItem;
    if (!productId || !color || !size || quantity === undefined) continue;

    const itemIndex = cart.items.findIndex(
      (item) => item.product.toString() === productId && item.color === color && item.size === size
    );

    if (itemIndex > -1) {
      // Exists -> Update or Delete
      if (quantity <= 0) {
        cart.items.splice(itemIndex, 1);
      } else {
        cart.items[itemIndex].quantity = quantity;
      }
    } else {
      // Doesn't exist -> Add new
      if (quantity > 0) {
        cart.items.push({ product: productId, color, size, quantity });
      }
    }
  }

  cart.updatedAt = Date.now();
  await cart.save();

  return true;
};
