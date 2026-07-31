import mongoose from 'mongoose';

const cartItemSchema = new mongoose.Schema({
  product: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Product', 
    required: true 
  },
  color: { 
    type: String, 
    required: true 
  },
  size: { 
    type: String, 
    required: true 
  },
  quantity: { 
    type: Number, 
    required: true,
    min: 1
  }
}, { _id: false }); // No need for a separate _id for each small item to optimize

const cartSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  items: [cartItemSchema],
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Setup indexes to optimize query performance
cartSchema.index({ user: 1 }, { unique: true })

const Cart = mongoose.model('Cart', cartSchema);
export default Cart;
