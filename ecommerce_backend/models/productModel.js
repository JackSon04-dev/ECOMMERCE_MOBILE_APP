import mongoose from 'mongoose'

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    shortDescription: { type: String },
    description: { type: String },
    thumbnail: { type: String, required: true },
    price: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    finalPrice: { type: Number },

    colorVariants: [
      {
        color: { type: String, required: true },
        images: [{ type: String }], // Ảnh dùng chung cho tất cả size của màu này
        sizes: [
          {
            size: { type: String, required: true },
            stock: { type: Number, default: 0 }
          }
        ]
      }
    ],

    tags: [String],
    isActive: { type: Boolean, default: true },

    averageRating: { type: Number, default: 0 },
    reviewCount: { type: Number, default: 0 },
    soldCount: { type: Number, default: 0 }
  },
  { timestamps: true }
)

productSchema.pre('save', function (next) {
  this.finalPrice = this.price * (1 - this.discount / 100)
  next()
})

const Product = mongoose.model('Product', productSchema)
export default Product
