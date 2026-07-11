const mongoose = require('mongoose');

const traceEventSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, default: '' },
  location: { type: String, default: '' },
  occurredAt: { type: Date, required: true },
}, { _id: false });

const traceSchema = new mongoose.Schema({
  traceCode: { type: String, required: true, unique: true, uppercase: true, trim: true },
  productName: { type: String, required: true, trim: true },
  batchCode: { type: String, required: true, trim: true },
  imageUrl: { type: String, default: '' },
  farmerName: { type: String, required: true, trim: true },
  farmName: { type: String, required: true, trim: true },
  origin: { type: String, required: true, trim: true },
  farmingMethod: { type: String, required: true, trim: true },
  certification: { type: String, default: '' },
  harvestDate: { type: Date, required: true },
  expiryDate: { type: Date },
  timeline: { type: [traceEventSchema], default: [] },
}, { timestamps: true });

traceSchema.index({ batchCode: 1 });

module.exports = mongoose.model('Trace', traceSchema);
