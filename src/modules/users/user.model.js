const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    email: { type: String, unique: true, required: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: ['farmer', 'supplier', 'customer'],
      default: 'customer',
    },
    fullName: { type: String, trim: true, default: '' },
    avatarUrl: { type: String, default: '' },
    address: { type: String, default: '' },
    isVerified: { type: Boolean, default: false }, // true sau khi verify OTP email
    isActive: { type: Boolean, default: true },
    refreshTokenHash: { type: String, select: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
