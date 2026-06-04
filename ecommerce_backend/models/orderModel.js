import mongoose from 'mongoose'

const orderSchema = new mongoose.Schema(
  {
    // 1. THÔNG TIN NGƯỜI MUA (User Info - Snapshot)
    // Lưu trực tiếp thông tin user để giữ nguyên dữ liệu lúc đặt hàng
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

    // 2. DANH SÁCH SẢN PHẨM ĐÃ MUA (Order Items)
    // Lưu chi tiết từng biến thể của từng sản phẩm
    orderItems: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Product',
          required: true
        },
        // Snapshot thông tin sản phẩm lúc mua
        productName: { type: String, required: true },
        finalPrice: { type: Number, required: true }, // Giá sau giảm

        // Chi tiết biến thể được chọn
        variant: {
          color: { type: String, required: true },
          colorImage: { type: String }, // Ảnh của màu đã chọn
          size: { type: String, required: true },
          quantity: { type: Number, required: true, min: 1 }
        },

        // Tổng tiền của item này = finalPrice * quantity
        itemTotal: { type: Number, required: true },

        // Đánh dấu đã review hay chưa
        isRated: { type: Boolean, default: false }
      }
    ],

    // 3. PHƯƠNG THỨC THANH TOÁN
    paymentMethod: {
      type: String,
      required: true,
      enum: ['COD', 'VNPay', 'ZaloPay', 'PayOS']
    },

    // 4. CHI PHÍ & TỔNG TIỀN
    itemsPrice: { type: Number, required: true }, // Tổng tiền sản phẩm (trước voucher & ship)
    shippingPrice: { type: Number, required: true, default: 20000 }, // Phí vận chuyển

    // 5. VOUCHER (nếu có)
    voucher: {
      voucherId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Voucher'
      },
      voucherCode: { type: String },
      voucherName: { type: String },
      discountAmount: { type: Number, default: 0 } // Số tiền được giảm từ voucher
    },

    // 6. TỔNG TIỀN THANH TOÁN
    // totalPrice = itemsPrice + shippingPrice - voucher.discountAmount
    totalPrice: { type: Number, required: true },

    // 7. TRẠNG THÁI ĐƠN HÀNG
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

    // 8. TRẠNG THÁI THANH TOÁN
    isPaid: { type: Boolean, default: false },

    // 9. VNPAY / ZALOPAY / PAYOS INFO
    vnpayTxnRef: { type: String },
    payosOrderCode: { type: String },
    zalopayTransId: { type: String },
    paidAt: { type: Date },

    // 10. LỊCH SỬ TRẠNG THÁI ĐƠN HÀNG (Event Timeline)
    // Ghi lại từng mốc thời gian thay đổi status để hiển thị Timeline trên App
    statusHistory: [
      {
        status: { type: String, required: true },
        updatedAt: { type: Date, default: Date.now },
        note: { type: String, default: '' } // Ghi chú tùy chọn (VD: "Đã giao cho shipper")
      }
    ]
  },
  { timestamps: true }
)

// Middleware tính toán tổng tiền trước khi lưu
orderSchema.pre('save', function (next) {
  // Tính itemsPrice từ orderItems
  this.itemsPrice = this.orderItems.reduce(
    (sum, item) => sum + item.itemTotal,
    0
  )

  // Tính totalPrice
  const voucherDiscount = this.voucher?.discountAmount || 0
  this.totalPrice = this.itemsPrice + this.shippingPrice - voucherDiscount

  // Đảm bảo totalPrice không âm
  if (this.totalPrice < 0) this.totalPrice = 0

  next()
})

const Order = mongoose.model('Order', orderSchema)
export default Order
