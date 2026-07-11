const mongoose = require('mongoose');

const marketPriceSchema = new mongoose.Schema({
  productName: { type: String, required: true, trim: true },
  category: { type: String, required: true, trim: true },
  region: { type: String, required: true, trim: true },
  province: { type: String, required: true, trim: true },
  unit: { type: String, required: true, trim: true, default: 'kg' },
  price: { type: Number, required: true, min: 0 },
  previousPrice: { type: Number, required: true, min: 0 },
  source: { type: String, required: true, trim: true },
  recordedAt: { type: Date, required: true, default: Date.now },
}, { timestamps: true });

marketPriceSchema.index({ recordedAt: -1, category: 1, region: 1 });
marketPriceSchema.index({ productName: 'text', province: 'text' });

module.exports = mongoose.model('MarketPrice', marketPriceSchema);
