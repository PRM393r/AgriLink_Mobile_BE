const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    email: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
    passwordHash: { type: String, select: false },
    phone: { type: String, unique: true, sparse: true, trim: true },
    firebaseUid: { type: String, unique: true, sparse: true, trim: true },
    role: {
      type: String,
      enum: ['farmer', 'supplier', 'customer', ''],
      default: '',
    },
    fullName: { type: String, trim: true, default: '' },
    avatarUrl: { type: String, default: '' },
    address: { type: String, default: '' },
    isVerified: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    refreshTokenHash: { type: String, select: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
