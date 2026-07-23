const bcrypt = require('bcryptjs');
const User = require('./user.model');
const { signAccess, signRefresh } = require('../../utils/jwt');
const { sendSuccess, sendError } = require('../../utils/response');

const buildTokenPair = (user) => {
  const payload = {
    sub: user._id.toString(),
    email: user.email,
    role: user.role,
  };
  return {
    accessToken: signAccess(payload),
    refreshToken: signRefresh(payload),
  };
};

const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.sub).lean();
    if (!user) return sendError(res, 404, 'User not found');
    return sendSuccess(res, user);
  } catch (err) {
    return sendError(res, 500, err.message);
  }
};

const updateMe = async (req, res) => {
  try {
    const allowed = ['fullName', 'avatarUrl', 'address'];
    const update = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) update[key] = req.body[key];
    }
    const currentUser = await User.findById(req.user.sub).lean();
    if (!currentUser) return sendError(res, 404, 'User not found');
    if (req.body.bankInfo !== undefined) {
      if (!['farmer', 'supplier'].includes(currentUser.role)) {
        return sendError(res, 403, 'Only farmer or supplier can update bank information');
      }
      const { bankCode = '', accountNumber = '', accountName = '' } = req.body.bankInfo;
      if (bankCode || accountNumber || accountName) {
        if (!bankCode || !accountNumber || !accountName) {
          return sendError(res, 400, 'bankCode, accountNumber and accountName are required');
        }
        if (!/^\d{6,20}$/.test(accountNumber)) {
          return sendError(res, 400, 'Invalid bank account number');
        }
      }
      update.bankInfo = { bankCode, accountNumber, accountName };
    }
    const user = await User.findByIdAndUpdate(req.user.sub, update, { new: true, lean: true });
    if (!user) return sendError(res, 404, 'User not found');
    return sendSuccess(res, user);
  } catch (err) {
    return sendError(res, 500, err.message);
  }
};

// PUT /users/me/role — Bước 3 sau verify email
// Phải cấp JWT mới vì authorize() đọc role từ access token, không từ DB.
const updateRole = async (req, res) => {
  try {
    const { role } = req.body;
    if (!['farmer', 'supplier', 'customer'].includes(role)) {
      return sendError(res, 400, 'Invalid role. Must be farmer | supplier | customer');
    }

    const update = { role };
    // Farmer/supplier mới chọn role lần đầu (chưa từng có role) phải chờ admin duyệt trước khi bán.
    // Đổi role qua lại (đã có role trước đó) không reset lại approval để tránh khoá nhầm seller đang hoạt động.
    if (['farmer', 'supplier'].includes(role)) {
      const currentUser = await User.findById(req.user.sub).select('role').lean();
      if (!currentUser?.role) update.sellerApprovalStatus = 'pending';
    }

    const user = await User.findByIdAndUpdate(req.user.sub, update, { new: true, lean: true });
    if (!user) return sendError(res, 404, 'User not found');

    const tokens = buildTokenPair(user);
    const tokenHash = await bcrypt.hash(tokens.refreshToken, 8);
    await User.findByIdAndUpdate(user._id, { refreshTokenHash: tokenHash });

    return sendSuccess(
      res,
      {
        role: user.role,
        sellerApprovalStatus: user.sellerApprovalStatus,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        user: {
          id: user._id,
          email: user.email,
          role: user.role,
          fullName: user.fullName,
        },
      },
      'Role updated'
    );
  } catch (err) {
    return sendError(res, 500, err.message);
  }
};

module.exports = { getMe, updateMe, updateRole };
