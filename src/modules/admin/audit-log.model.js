const mongoose = require('mongoose');

// Ghi lại thao tác quản trị: ai, làm gì, trên đối tượng nào, khi nào.
const auditLogSchema = new mongoose.Schema(
  {
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    adminName: { type: String, required: true },
    action: {
      type: String,
      enum: [
        'user_locked', 'user_unlocked', 'seller_approved', 'seller_rejected',
        'product_hidden', 'product_unhidden', 'review_deleted',
        'dispute_resolved', 'broadcast_sent',
      ],
      required: true,
    },
    targetType: { type: String, enum: ['user', 'product', 'review', 'dispute', 'notification'], required: true },
    targetId: { type: mongoose.Schema.Types.ObjectId },
    detail: { type: String, default: '' },
  },
  { timestamps: true }
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ adminId: 1, createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
