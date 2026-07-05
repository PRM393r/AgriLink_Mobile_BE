const mongoose = require('mongoose');

const productImageSchema = new mongoose.Schema(
  { url: { type: String, required: true }, isPrimary: { type: Boolean, default: false } },
  { _id: false }
);

const productCertificationSchema = new mongoose.Schema(
  { name: { type: String, required: true } },
  { _id: false }
);

const productSchema = new mongoose.Schema(
  {
    sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    sellerType: { type: String, enum: ['farmer', 'supplier'], required: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    category: { type: String, default: '' },
    pricePerUnit: { type: Number, required: true, min: 0 },
    unit: { type: String, default: 'kg' }, // kg, g, box, bottle, bunch, piece, bag
    availableQuantity: { type: Number, default: 0, min: 0 },
    minOrderQuantity: { type: Number, default: 1, min: 0 },
    status: {
      type: String,
      enum: ['draft', 'active', 'sold_out', 'hidden'],
      default: 'active',
    },
    farmingType: { type: String, default: '' }, // organic, traditional, vietgap, global_gap
    province: { type: String, default: '' },
    harvestDate: { type: Date },
    expiryDate: { type: Date },
    images: [productImageSchema],
    certifications: [productCertificationSchema],
    viewCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Text index cho tìm kiếm
productSchema.index({ name: 'text', description: 'text', category: 'text' });
productSchema.index({ sellerId: 1, status: 1 });
productSchema.index({ category: 1, status: 1 });

module.exports = mongoose.model('Product', productSchema);
