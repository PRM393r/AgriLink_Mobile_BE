const router = require('express').Router();
const { authenticate } = require('../../middleware/auth');
const ctrl = require('./auth.controller');

// ── Public ────────────────────────────────────────────────────────────────────
router.post('/register', ctrl.register);         // Bước 1: tạo tài khoản + gửi OTP email
router.post('/verify-email', ctrl.verifyEmail);  // Bước 2: xác nhận OTP
router.post('/resend-otp', ctrl.resendOtp);      // Gửi lại OTP
// Bước 3: PUT /users/me/role (chọn role) — protected, xem users.router.js
router.post('/login', ctrl.login);               // Bước 4: đăng nhập email + password
router.post('/refresh', ctrl.refresh);           // Đổi refresh token

// ── Protected ─────────────────────────────────────────────────────────────────
router.post('/logout', authenticate, ctrl.logout);

module.exports = router;
