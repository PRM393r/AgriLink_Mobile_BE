const mongoose = require('mongoose');

// Khiếu nại đơn hàng do buyer tạo, admin xử lý.
const disputeSchema = new mongoose.Schema(
  {
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
    raisedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    reason: { type: String, required: true },
    status: {
      type: String,
      enum: ['open', 'resolved', 'rejected'],
      default: 'open',
    },
    resolutionNote: { type: String, default: '' },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    resolvedAt: { type: Date },
  },
  { timestamps: true }
);

disputeSchema.index({ status: 1, createdAt: -1 });
disputeSchema.index({ orderId: 1 });

module.exports = mongoose.model('Dispute', disputeSchema);
