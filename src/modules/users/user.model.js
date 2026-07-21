const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    email: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
    passwordHash: { type: String, select: false },
    phone: { type: String, unique: true, sparse: true, trim: true },
    firebaseUid: { type: String, unique: true, sparse: true, trim: true },
    role: {
      type: String,
      enum: ['farmer', 'supplier', 'customer', 'admin', ''],
      default: '',
    },
    fullName: { type: String, trim: true, default: '' },
    avatarUrl: { type: String, default: '' },
    address: { type: String, default: '' },
    bankInfo: {
      bankCode: { type: String, trim: true, uppercase: true, default: '' },
      accountNumber: { type: String, trim: true, default: '' },
      accountName: { type: String, trim: true, uppercase: true, default: '' },
    },
    isVerified: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    // Duyệt seller mới (farmer/supplier): mặc định 'approved' để không chặn seller đã hoạt động
    // từ trước khi tính năng này ra đời — chỉ endpoint tạo mới (register) set 'pending'.
    sellerApprovalStatus: {
      type: String,
      enum: ['approved', 'pending', 'rejected'],
      default: 'approved',
    },
    refreshTokenHash: { type: String, select: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
