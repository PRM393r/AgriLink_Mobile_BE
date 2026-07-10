const bcrypt = require('bcryptjs');
const User = require('../users/user.model');
const Otp = require('./otp.model');
const { signAccess, signRefresh, verifyRefresh } = require('../../utils/jwt');
const { sendSuccess, sendError } = require('../../utils/response');
const { sendOtpEmail } = require('../../utils/mailer');

// ─── Helpers ──────────────────────────────────────────────────────────────────

const buildTokenPair = (user) => {
  const payload = { sub: user._id.toString(), email: user.email, role: user.role };
  return { accessToken: signAccess(payload), refreshToken: signRefresh(payload) };
};

const OTP_TTL_MS = 10 * 60 * 1000; // 10 phút

const generateOtpCode = () =>
  process.env.NODE_ENV === 'production'
    ? Math.floor(100000 + Math.random() * 900000).toString()
    : '123456'; // dev mock

// ─── POST /auth/register ──────────────────────────────────────────────────────
// Bước 1: tạo tài khoản + gửi OTP verify email
const register = async (req, res) => {
  try {
    const { email, password, fullName } = req.body;
    if (!email || !password) return sendError(res, 400, 'email and password are required');
    if (password.length < 6) return sendError(res, 400, 'password must be at least 6 characters');

    const existing = await User.findOne({ email });
    if (existing) return sendError(res, 409, 'Email already registered');

    const passwordHash = await bcrypt.hash(password, 10);
    await User.create({ email, passwordHash, fullName: fullName || '', isVerified: false });

    // Gửi OTP
    const code = generateOtpCode();
    await Otp.deleteMany({ email, purpose: 'verify_email' });
    await Otp.create({ email, code, purpose: 'verify_email', expiresAt: new Date(Date.now() + OTP_TTL_MS) });
    await sendOtpEmail(email, code);

    const msg = process.env.NODE_ENV !== 'production'
      ? `Registration successful. OTP sent (dev: ${code})`
      : 'Registration successful. Check your email for the verification code.';

    return sendSuccess(res, { email }, msg, 201);
  } catch (err) {
    return sendError(res, 500, err.message);
  }
};

// ─── POST /auth/verify-email ──────────────────────────────────────────────────
// Bước 2: xác nhận OTP email
const verifyEmail = async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) return sendError(res, 400, 'email and code are required');

    const otp = await Otp.findOne({
      email,
      purpose: 'verify_email',
      used: false,
      expiresAt: { $gt: new Date() },
    });
    if (!otp || otp.code !== code) return sendError(res, 400, 'Invalid or expired OTP');

    otp.used = true;
    await otp.save();

    await User.findOneAndUpdate({ email }, { isVerified: true });

    return sendSuccess(res, null, 'Email verified. Please choose your role.');
  } catch (err) {
    return sendError(res, 500, err.message);
  }
};

// ─── POST /auth/resend-otp ────────────────────────────────────────────────────
// Gửi lại OTP nếu hết hạn
const resendOtp = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return sendError(res, 400, 'email is required');

    const user = await User.findOne({ email });
    if (!user) return sendError(res, 404, 'Email not registered');
    if (user.isVerified) return sendError(res, 400, 'Email already verified');

    const code = generateOtpCode();
    await Otp.deleteMany({ email, purpose: 'verify_email' });
    await Otp.create({ email, code, purpose: 'verify_email', expiresAt: new Date(Date.now() + OTP_TTL_MS) });
    await sendOtpEmail(email, code);

    const msg = process.env.NODE_ENV !== 'production'
      ? `OTP resent (dev: ${code})`
      : 'OTP resent. Check your email.';

    return sendSuccess(res, null, msg);
  } catch (err) {
    return sendError(res, 500, err.message);
  }
};

// ─── POST /auth/login ─────────────────────────────────────────────────────────
// Bước 4 (sau verify + chọn role): email + password → token pair
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return sendError(res, 400, 'email and password are required');

    const user = await User.findOne({ email }).select('+passwordHash');
    if (!user) return sendError(res, 401, 'Invalid email or password');
    if (!user.isVerified) return sendError(res, 403, 'Email not verified. Please verify your email first.');
    if (!user.isActive) return sendError(res, 403, 'Account disabled');

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) return sendError(res, 401, 'Invalid email or password');

    const tokens = buildTokenPair(user);
    const tokenHash = await bcrypt.hash(tokens.refreshToken, 8);
    await User.findByIdAndUpdate(user._id, { refreshTokenHash: tokenHash });

    return sendSuccess(res, {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: { id: user._id, email: user.email, role: user.role, fullName: user.fullName },
    });
  } catch (err) {
    return sendError(res, 500, err.message);
  }
};

// ─── POST /auth/refresh ───────────────────────────────────────────────────────
const refresh = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return sendError(res, 400, 'refreshToken is required');

    let payload;
    try {
      payload = verifyRefresh(refreshToken);
    } catch {
      return sendError(res, 401, 'Refresh token invalid or expired');
    }

    const user = await User.findById(payload.sub).select('+refreshTokenHash');
    if (!user || !user.refreshTokenHash) return sendError(res, 401, 'Session not found. Please login again.');

    const match = await bcrypt.compare(refreshToken, user.refreshTokenHash);
    if (!match) return sendError(res, 401, 'Refresh token revoked');

    const tokens = buildTokenPair(user);
    const tokenHash = await bcrypt.hash(tokens.refreshToken, 8);
    await User.findByIdAndUpdate(user._id, { refreshTokenHash: tokenHash });

    return sendSuccess(res, { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken });
  } catch (err) {
    return sendError(res, 500, err.message);
  }
};

// ─── POST /auth/logout ────────────────────────────────────────────────────────
const logout = async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user.sub, { refreshTokenHash: null });
    return sendSuccess(res, null, 'Logged out');
  } catch (err) {
    return sendError(res, 500, err.message);
  }
};

const jwt = require('jsonwebtoken');

// ─── POST /auth/sync ─────────────────────────────────────────────────────────
const syncFirebase = async (req, res) => {
  try {
    let idToken = req.headers.authorization;
    if (!idToken) {
      return sendError(res, 400, 'Authorization header with Bearer token is required');
    }
    if (idToken.startsWith('Bearer ')) {
      idToken = idToken.substring(7);
    }

    let uid;
    let phone;

    if (idToken.startsWith('mock_') || idToken === 'mock-token') {
      uid = idToken;
      phone = '+84999999999';
    } else {
      try {
        const decoded = jwt.decode(idToken);
        if (!decoded) {
          return sendError(res, 400, 'Invalid token format');
        }
        uid = decoded.uid || decoded.sub;
        phone = decoded.phone_number || decoded.phone || '+84999999999';
      } catch (err) {
        return sendError(res, 400, 'Failed to decode Firebase token: ' + err.message);
      }
    }

    if (!uid) {
      return sendError(res, 400, 'Firebase UID not found in token');
    }

    let user = await User.findOne({
      $or: [{ firebaseUid: uid }, { phone }]
    }).select('+refreshTokenHash');

    let isNewUser = false;

    if (!user) {
      user = await User.create({
        firebaseUid: uid,
        phone,
        isVerified: true,
        role: '',
        fullName: '',
      });
      isNewUser = true;
    } else {
      if (!user.firebaseUid) {
        user.firebaseUid = uid;
        await user.save();
      }
      if (!user.role || !user.fullName) {
        isNewUser = true;
      }
    }

    const tokens = buildTokenPair(user);
    const tokenHash = await bcrypt.hash(tokens.refreshToken, 8);
    await User.findByIdAndUpdate(user._id, { refreshTokenHash: tokenHash });

    return sendSuccess(res, {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      isNewUser,
      user: {
        id: user._id,
        email: user.email || '',
        phone: user.phone || '',
        role: user.role || '',
        fullName: user.fullName || '',
      },
    }, 'Firebase session synchronized successfully');
  } catch (err) {
    return sendError(res, 500, err.message);
  }
};

module.exports = { register, verifyEmail, resendOtp, login, refresh, logout, syncFirebase };

