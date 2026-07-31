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
        images: [{ type: String }], // Image shared for all sizes of this color
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

// 1. Basic Index (Newest) - Skipped because MongoDB automatically indexes _id
productSchema.index({ tags: 1, _id: -1 })

// 2. Index for Sort by Best Selling feature
productSchema.index({ soldCount: -1, _id: -1 })
productSchema.index({ tags: 1, soldCount: -1, _id: -1 })

// 3. Index for Sort by Price Asc/Desc feature
productSchema.index({ finalPrice: 1, _id: 1 })
productSchema.index({ tags: 1, finalPrice: 1, _id: 1 })



const Product = mongoose.model('Product', productSchema)
export default Product
