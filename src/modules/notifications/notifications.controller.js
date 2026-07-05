const Notification = require('./notification.model');
const { sendSuccess, sendError } = require('../../utils/response');

// ─── GET /notifications ───────────────────────────────────────────────────────
// TV4 task #1, #2: danh sách + count unread
const getNotifications = async (req, res) => {
  try {
    const { isRead, page = 1, limit = 30 } = req.query;
    const filter = { userId: req.user.sub };
    if (isRead !== undefined) filter.isRead = isRead === 'true';

    const skip = (Number(page) - 1) * Number(limit);
    const [items, total, unreadCount] = await Promise.all([
      Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
      Notification.countDocuments(filter),
      Notification.countDocuments({ userId: req.user.sub, isRead: false }),
    ]);

    return sendSuccess(res, { items, total, unreadCount, page: Number(page), limit: Number(limit) });
  } catch (err) {
    return sendError(res, 500, err.message);
  }
};

// ─── PATCH /notifications/:id/read ────────────────────────────────────────────
// TV4 task #4
const markAsRead = async (req, res) => {
  try {
    const notif = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.sub },
      { isRead: true },
      { new: true, lean: true }
    );
    if (!notif) return sendError(res, 404, 'Notification not found');
    return sendSuccess(res, notif, 'Marked as read');
  } catch (err) {
    return sendError(res, 500, err.message);
  }
};

// ─── PATCH /notifications/read-all ────────────────────────────────────────────
// TV4 task #4
const markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany({ userId: req.user.sub, isRead: false }, { isRead: true });
    return sendSuccess(res, null, 'All notifications marked as read');
  } catch (err) {
    return sendError(res, 500, err.message);
  }
};

// ─── Internal helper: tạo notification ───────────────────────────────────────
// Dùng bởi orders.controller khi status thay đổi
const createNotification = async (userId, type, title, body, data = {}) => {
  return Notification.create({ userId, type, title, body, data });
};

module.exports = { getNotifications, markAsRead, markAllAsRead, createNotification };
