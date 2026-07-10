const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    productSnapshot: {
      name: String,
      pricePerUnit: Number,
      unit: String,
      imageUrl: String,
    },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true },
    totalPrice: { type: Number, required: true },
  },
  { _id: true }
);

const orderSchema = new mongoose.Schema(
  {
    orderCode: { type: String, unique: true },
    buyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'preparing', 'shipping', 'delivered', 'cancelled'],
      default: 'pending',
    },
    items: [orderItemSchema],
    shippingAddressSnapshot: {
      recipientName: String,
      phone: String,
      address: String,
    },
    subtotal: { type: Number, required: true },
    shippingFee: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true },
    paymentMethod: {
      type: String,
      enum: ['cod', 'bank_transfer', 'vnpay'],
      default: 'cod',
    },
    paymentStatus: {
      type: String,
      enum: ['unpaid', 'paid', 'refunded'],
      default: 'unpaid',
    },
    note: { type: String, default: '' },
    cancelReason: { type: String, default: '' },
    statusHistory: [
      {
        status: String,
        changedAt: { type: Date, default: Date.now },
        _id: false,
      },
    ],
  },
  { timestamps: true }
);

// Tự sinh orderCode trước khi lưu
orderSchema.pre('save', async function (next) {
  if (!this.orderCode) {
    const d = new Date();
    const date = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
    const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
    this.orderCode = `AGL-${date}-${rand}`;
  }
  next();
});

orderSchema.index({ buyerId: 1, status: 1 });
orderSchema.index({ sellerId: 1, status: 1 });

module.exports = mongoose.model('Order', orderSchema);
