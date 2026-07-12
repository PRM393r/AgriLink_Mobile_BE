const User = require('./user.model');
const { sendSuccess, sendError } = require('../../utils/response');

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
const updateRole = async (req, res) => {
  try {
    const { role } = req.body;
    if (!['farmer', 'supplier', 'customer'].includes(role)) {
      return sendError(res, 400, 'Invalid role. Must be farmer | supplier | customer');
    }
    const user = await User.findByIdAndUpdate(
      req.user.sub,
      { role },
      { new: true, lean: true }
    );
    if (!user) return sendError(res, 404, 'User not found');
    return sendSuccess(res, { role: user.role }, 'Role updated');
  } catch (err) {
    return sendError(res, 500, err.message);
  }
};

module.exports = { getMe, updateMe, updateRole };
