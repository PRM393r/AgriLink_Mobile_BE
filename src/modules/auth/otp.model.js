const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
  email: { type: String, required: true, lowercase: true },
  code: { type: String, required: true },
  purpose: { type: String, enum: ['verify_email'], default: 'verify_email' },
  expiresAt: { type: Date, required: true },
  used: { type: Boolean, default: false },
});

// TTL index: MongoDB tự xóa document sau expiresAt
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Otp', otpSchema);
