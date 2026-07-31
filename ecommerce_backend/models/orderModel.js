import mongoose from 'mongoose'

const orderSchema = new mongoose.Schema(
  {
    // 1. BUYER INFO (User Info - Snapshot)
    // Save user info directly to preserve data at the time of ordering
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    userInfo: {
      username: { type: String, required: true },
      address: { type: String, required: true },
      phoneNumber: { type: String, required: true }
    },

    // 2. PURCHASED PRODUCTS LIST (Order Items)
    // Save details of each variant for every product
    orderItems: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Product',
          required: true
        },
        // Snapshot product info at the time of purchase
        productName: { type: String, required: true },
        finalPrice: { type: Number, required: true }, // Price after discount

        // Selected variant details
        variant: {
          color: { type: String, required: true },
          colorImage: { type: String }, // Image of the selected color
          size: { type: String, required: true },
          quantity: { type: Number, required: true, min: 1 }
        },

        // Total price of this item = finalPrice * quantity
        itemTotal: { type: Number, required: true }
      }
    ],

    // 3. PAYMENT METHOD
    paymentMethod: {
      type: String,
      required: true,
      enum: ['COD', 'VNPay', 'ZaloPay', 'PayOS']
    },

    // 4. COSTS & TOTAL AMOUNT
    itemsPrice: { type: Number, required: true }, // Total product price (before voucher & shipping)
    shippingPrice: { type: Number, required: true, default: 20000 }, // Shipping fee

    // 5. VOUCHER (if any)
    voucher: {
      voucherId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Voucher'
      },
      voucherCode: { type: String },
      voucherName: { type: String },
      discountAmount: { type: Number, default: 0 } // Amount discounted by voucher
    },

    // 6. TOTAL PAYMENT AMOUNT
    // totalPrice = itemsPrice + shippingPrice - voucher.discountAmount
    totalPrice: { type: Number, required: true },

    // 7. ORDER STATUS
    status: {
      type: String,
      enum: [
        'Chờ xác nhận', // Pending
        'Đã xác nhận', // Confirmed
        'Đang giao', // Shipping
        'Đã giao', // Delivered
        'Thành công', // Completed
        'Đã hủy' // Cancelled
      ],
      default: 'Chờ xác nhận'
    },

    // 8. PAYMENT STATUS
    isPaid: { type: Boolean, default: false },

    // 9. VNPAY / ZALOPAY / PAYOS INFO
    vnpayTxnRef: { type: String },
    payosOrderCode: { type: String },
    zalopayTransId: { type: String },
    paidAt: { type: Date },

    // 10. ORDER REVIEW STATUS
    // true when all products in the order have been reviewed
    isRated: { type: Boolean, default: false },

    // 11. ORDER STATUS HISTORY (Event Timeline)
    // Record each status change timestamp to display Timeline on App
    statusHistory: [
      {
        status: { type: String, required: true },
        updatedAt: { type: Date, default: Date.now },
        note: { type: String, default: '' } // Optional note (E.g.: "Handed over to shipper")
      }
    ]
  },
  { timestamps: true }
)

// Middleware to calculate total amount before saving
orderSchema.pre('save', function (next) {
  // Calculate itemsPrice from orderItems
  this.itemsPrice = this.orderItems.reduce(
    (sum, item) => sum + item.itemTotal,
    0
  )

  // Calculate totalPrice
  const voucherDiscount = this.voucher?.discountAmount || 0
  this.totalPrice = this.itemsPrice + this.shippingPrice - voucherDiscount

  // Ensure totalPrice is not negative
  if (this.totalPrice < 0) this.totalPrice = 0

  next()
})

// Setup indexes to optimize query performance
orderSchema.index({ user: 1 })
orderSchema.index({ payosOrderCode: 1 })


const Order = mongoose.model('Order', orderSchema)
export default Order
