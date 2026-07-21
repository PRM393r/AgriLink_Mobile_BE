const User = require('../users/user.model');
const Order = require('../orders/order.model');
const Product = require('../products/product.model');
const Review = require('../reviews/review.model');
const Notification = require('../notifications/notification.model');
const AuditLog = require('./audit-log.model');
const Dispute = require('./dispute.model');
const { sendSuccess, sendError } = require('../../utils/response');

const logAction = (req, action, targetType, targetId, detail = '') =>
  AuditLog.create({
    adminId: req.user.sub,
    adminName: req.user.email,
    action,
    targetType,
    targetId,
    detail,
  });

// ─── GET /admin/dashboard ─────────────────────────────────────────────────────
// Tổng quan toàn hệ thống: user theo role, order theo status, doanh thu, sản phẩm.
const getDashboard = async (_req, res) => {
  try {
    const [
      usersByRole,
      ordersByStatus,
      revenueResult,
      totalProducts,
      activeProducts,
    ] = await Promise.all([
      User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]),
      Order.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Order.aggregate([
        { $match: { status: 'delivered' } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } },
      ]),
      Product.countDocuments(),
      Product.countDocuments({ status: 'active' }),
    ]);

    const roleCounts = { farmer: 0, supplier: 0, customer: 0, admin: 0 };
    usersByRole.forEach((r) => {
      if (r._id && roleCounts[r._id] !== undefined) roleCounts[r._id] = r.count;
    });

    const statusCounts = { pending: 0, confirmed: 0, preparing: 0, shipping: 0, delivered: 0, cancelled: 0 };
    ordersByStatus.forEach((s) => {
      if (statusCounts[s._id] !== undefined) statusCounts[s._id] = s.count;
    });

    return sendSuccess(res, {
      usersByRole: roleCounts,
      totalUsers: Object.values(roleCounts).reduce((a, b) => a + b, 0),
      ordersByStatus: statusCounts,
      totalOrders: Object.values(statusCounts).reduce((a, b) => a + b, 0),
      totalRevenue: revenueResult[0]?.total || 0,
      totalProducts,
      activeProducts,
    });
  } catch (err) {
    return sendError(res, 500, err.message);
  }
};

// ─── GET /admin/revenue/monthly ───────────────────────────────────────────────
// Doanh thu toàn hệ thống theo tháng trong năm hiện tại (không lọc theo seller).
const getMonthlyRevenue = async (req, res) => {
  try {
    const { type } = req.query; // 'daily' hoặc 'monthly'
    const now = new Date();
    const currentYear = now.getFullYear();

    if (type === 'daily') {
      const currentMonth = now.getMonth() + 1;
      const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();

      const stats = await Order.aggregate([
        {
          $match: {
            status: 'delivered',
            createdAt: {
              $gte: new Date(`${currentYear}-${currentMonth.toString().padStart(2, '0')}-01T00:00:00.000Z`),
              $lte: new Date(`${currentYear}-${currentMonth.toString().padStart(2, '0')}-${daysInMonth}T23:59:59.999Z`),
            },
          },
        },
        { $group: { _id: { $dayOfMonth: '$createdAt' }, revenue: { $sum: '$totalAmount' } } },
        { $sort: { _id: 1 } },
      ]);

      const formatted = Array.from({ length: daysInMonth }, (_, i) => {
        const found = stats.find((s) => s._id === i + 1);
        return { label: i + 1, revenue: found ? found.revenue : 0 };
      });
      return sendSuccess(res, formatted);
    }

    const stats = await Order.aggregate([
      {
        $match: {
          status: 'delivered',
          createdAt: {
            $gte: new Date(`${currentYear}-01-01T00:00:00.000Z`),
            $lte: new Date(`${currentYear}-12-31T23:59:59.999Z`),
          },
        },
      },
      { $group: { _id: { $month: '$createdAt' }, revenue: { $sum: '$totalAmount' } } },
      { $sort: { _id: 1 } },
    ]);

    const formatted = Array.from({ length: 12 }, (_, i) => {
      const found = stats.find((s) => s._id === i + 1);
      return { label: i + 1, revenue: found ? found.revenue : 0 };
    });
    return sendSuccess(res, formatted);
  } catch (err) {
    return sendError(res, 500, err.message);
  }
};

// ─── GET /admin/users ──────────────────────────────────────────────────────────
const getUsers = async (req, res) => {
  try {
    const { role, isActive, search, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (role) filter.role = role;
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    if (search) {
      filter.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      User.find(filter)
        .select('-passwordHash -refreshTokenHash')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      User.countDocuments(filter),
    ]);

    return sendSuccess(res, { items, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    return sendError(res, 500, err.message);
  }
};

// ─── PATCH /admin/users/:id/active ──────────────────────────────────────────────
// Khóa/mở khóa tài khoản. Không cho tự khóa chính mình để tránh admin tự khóa bản thân.
const setUserActive = async (req, res) => {
  try {
    const { isActive } = req.body;
    if (typeof isActive !== 'boolean') return sendError(res, 400, 'isActive must be boolean');
    if (req.params.id === req.user.sub) {
      return sendError(res, 400, 'Không thể tự khóa tài khoản của chính mình');
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive },
      { new: true, lean: true }
    ).select('-passwordHash -refreshTokenHash');
    if (!user) return sendError(res, 404, 'User not found');

    await logAction(req, isActive ? 'user_unlocked' : 'user_locked', 'user', user._id, user.email);

    return sendSuccess(res, user, isActive ? 'Đã mở khóa tài khoản' : 'Đã khóa tài khoản');
  } catch (err) {
    return sendError(res, 500, err.message);
  }
};

// ─── POST /admin/notifications/broadcast ────────────────────────────────────────
// Gửi thông báo cho toàn bộ user hoặc lọc theo role. insertMany thay vì tạo lẻ để
// tránh N round-trip DB khi số user lớn.
const broadcastNotification = async (req, res) => {
  try {
    const { title, body, role } = req.body;
    if (!title || !body) return sendError(res, 400, 'title và body là bắt buộc');

    const userFilter = { isActive: true };
    if (role) userFilter.role = role;

    const targets = await User.find(userFilter).select('_id').lean();
    if (!targets.length) return sendError(res, 404, 'Không tìm thấy người dùng phù hợp');

    const docs = targets.map((u) => ({
      userId: u._id,
      type: 'system',
      title,
      body,
      data: {},
    }));
    await Notification.insertMany(docs);
    await logAction(req, 'broadcast_sent', 'notification', null, `${title} → ${role || 'all'} (${docs.length})`);

    return sendSuccess(res, { sentCount: docs.length }, `Đã gửi thông báo tới ${docs.length} người dùng`, 201);
  } catch (err) {
    return sendError(res, 500, err.message);
  }
};

// ─── GET /admin/analytics/user-growth ───────────────────────────────────────────
// Số user mới đăng ký theo tháng trong năm hiện tại (line chart).
const getUserGrowth = async (_req, res) => {
  try {
    const currentYear = new Date().getFullYear();
    const stats = await User.aggregate([
      {
        $match: {
          createdAt: {
            $gte: new Date(`${currentYear}-01-01T00:00:00.000Z`),
            $lte: new Date(`${currentYear}-12-31T23:59:59.999Z`),
          },
        },
      },
      { $group: { _id: { $month: '$createdAt' }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);

    const formatted = Array.from({ length: 12 }, (_, i) => {
      const found = stats.find((s) => s._id === i + 1);
      return { label: i + 1, count: found ? found.count : 0 };
    });
    return sendSuccess(res, formatted);
  } catch (err) {
    return sendError(res, 500, err.message);
  }
};

// ─── GET /admin/analytics/top-sellers ───────────────────────────────────────────
const getTopSellers = async (req, res) => {
  try {
    const limit = Number(req.query.limit) || 5;
    const results = await Order.aggregate([
      { $match: { status: 'delivered' } },
      { $group: { _id: '$sellerId', revenue: { $sum: '$totalAmount' }, orderCount: { $sum: 1 } } },
      { $sort: { revenue: -1 } },
      { $limit: limit },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'seller' } },
      { $unwind: '$seller' },
      { $project: { sellerId: '$_id', sellerName: '$seller.fullName', revenue: 1, orderCount: 1, _id: 0 } },
    ]);
    return sendSuccess(res, results);
  } catch (err) {
    return sendError(res, 500, err.message);
  }
};

// ─── GET /admin/analytics/top-products ──────────────────────────────────────────
const getTopProducts = async (req, res) => {
  try {
    const limit = Number(req.query.limit) || 5;
    const results = await Order.aggregate([
      { $match: { status: 'delivered' } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.productId',
          name: { $first: '$items.productSnapshot.name' },
          totalQuantity: { $sum: '$items.quantity' },
          totalRevenue: { $sum: '$items.totalPrice' },
        },
      },
      { $sort: { totalRevenue: -1 } },
      { $limit: limit },
    ]);
    return sendSuccess(res, results);
  } catch (err) {
    return sendError(res, 500, err.message);
  }
};

// ─── GET /admin/sellers/pending ─────────────────────────────────────────────────
const getPendingSellers = async (_req, res) => {
  try {
    const sellers = await User.find({
      role: { $in: ['farmer', 'supplier'] },
      sellerApprovalStatus: 'pending',
    })
      .select('-passwordHash -refreshTokenHash')
      .sort({ createdAt: -1 })
      .lean();
    return sendSuccess(res, sellers);
  } catch (err) {
    return sendError(res, 500, err.message);
  }
};

// ─── PATCH /admin/sellers/:id/approval ──────────────────────────────────────────
const setSellerApproval = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['approved', 'rejected'].includes(status)) {
      return sendError(res, 400, 'status phải là approved hoặc rejected');
    }
    const seller = await User.findOneAndUpdate(
      { _id: req.params.id, role: { $in: ['farmer', 'supplier'] } },
      { sellerApprovalStatus: status },
      { new: true, lean: true }
    ).select('-passwordHash -refreshTokenHash');
    if (!seller) return sendError(res, 404, 'Seller not found');

    await logAction(req, status === 'approved' ? 'seller_approved' : 'seller_rejected', 'user', seller._id, seller.email);
    await Notification.create({
      userId: seller._id,
      type: 'system',
      title: status === 'approved' ? 'Tài khoản bán hàng đã được duyệt' : 'Tài khoản bán hàng bị từ chối',
      body: status === 'approved'
        ? 'Bạn có thể bắt đầu đăng bán sản phẩm trên AgriLink.'
        : 'Yêu cầu bán hàng của bạn chưa được chấp thuận. Vui lòng liên hệ hỗ trợ.',
      data: {},
    });

    return sendSuccess(res, seller, `Đã ${status === 'approved' ? 'duyệt' : 'từ chối'} seller`);
  } catch (err) {
    return sendError(res, 500, err.message);
  }
};

// ─── GET /admin/products ────────────────────────────────────────────────────────
const getProducts = async (req, res) => {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (search) filter.name = { $regex: search, $options: 'i' };

    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      Product.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
      Product.countDocuments(filter),
    ]);
    return sendSuccess(res, { items, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    return sendError(res, 500, err.message);
  }
};

// ─── PATCH /admin/products/:id/visibility ───────────────────────────────────────
// Ẩn sản phẩm vi phạm (status='hidden') hoặc khôi phục lại 'active'.
const setProductVisibility = async (req, res) => {
  try {
    const { hidden } = req.body;
    if (typeof hidden !== 'boolean') return sendError(res, 400, 'hidden must be boolean');

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { status: hidden ? 'hidden' : 'active' },
      { new: true, lean: true }
    );
    if (!product) return sendError(res, 404, 'Product not found');

    await logAction(req, hidden ? 'product_hidden' : 'product_unhidden', 'product', product._id, product.name);

    return sendSuccess(res, product, hidden ? 'Đã ẩn sản phẩm' : 'Đã khôi phục sản phẩm');
  } catch (err) {
    return sendError(res, 500, err.message);
  }
};

// ─── DELETE /admin/reviews/:id ───────────────────────────────────────────────────
// Xóa review vi phạm/spam.
const deleteReview = async (req, res) => {
  try {
    const review = await Review.findByIdAndDelete(req.params.id).lean();
    if (!review) return sendError(res, 404, 'Review not found');

    await logAction(req, 'review_deleted', 'review', review._id, review.comment?.slice(0, 100) || '');

    return sendSuccess(res, null, 'Đã xóa đánh giá');
  } catch (err) {
    return sendError(res, 500, err.message);
  }
};

// ─── GET /admin/disputes ─────────────────────────────────────────────────────────
const getDisputes = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = {};
    if (status) filter.status = status;

    const disputes = await Dispute.find(filter)
      .populate('orderId', 'orderCode totalAmount status')
      .populate('raisedBy', 'fullName email')
      .sort({ createdAt: -1 })
      .lean();
    return sendSuccess(res, disputes);
  } catch (err) {
    return sendError(res, 500, err.message);
  }
};

// ─── PATCH /admin/disputes/:id ────────────────────────────────────────────────────
const resolveDispute = async (req, res) => {
  try {
    const { status, resolutionNote } = req.body;
    if (!['resolved', 'rejected'].includes(status)) {
      return sendError(res, 400, 'status phải là resolved hoặc rejected');
    }

    const dispute = await Dispute.findByIdAndUpdate(
      req.params.id,
      { status, resolutionNote: resolutionNote || '', resolvedBy: req.user.sub, resolvedAt: new Date() },
      { new: true, lean: true }
    );
    if (!dispute) return sendError(res, 404, 'Dispute not found');

    await logAction(req, 'dispute_resolved', 'dispute', dispute._id, resolutionNote || '');
    await Notification.create({
      userId: dispute.raisedBy,
      type: 'system',
      title: 'Khiếu nại đã được xử lý',
      body: resolutionNote || 'Khiếu nại của bạn đã được admin xem xét.',
      data: { disputeId: dispute._id.toString() },
    });

    return sendSuccess(res, dispute, 'Đã xử lý khiếu nại');
  } catch (err) {
    return sendError(res, 500, err.message);
  }
};

// ─── GET /admin/audit-logs ────────────────────────────────────────────────────────
const getAuditLogs = async (req, res) => {
  try {
    const { page = 1, limit = 30 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      AuditLog.find().sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
      AuditLog.countDocuments(),
    ]);
    return sendSuccess(res, { items, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    return sendError(res, 500, err.message);
  }
};

// ─── GET /admin/reports/orders.csv ──────────────────────────────────────────────
// Export đơn hàng trong khoảng thời gian ra CSV.
const exportOrdersCsv = async (req, res) => {
  try {
    const { from, to } = req.query;
    const filter = {};
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(to);
    }

    const orders = await Order.find(filter).sort({ createdAt: -1 }).lean();

    const header = 'orderCode,status,paymentMethod,paymentStatus,subtotal,shippingFee,totalAmount,createdAt\n';
    const escapeCsv = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const rows = orders
      .map((o) =>
        [o.orderCode, o.status, o.paymentMethod, o.paymentStatus, o.subtotal, o.shippingFee, o.totalAmount, o.createdAt.toISOString()]
          .map(escapeCsv)
          .join(',')
      )
      .join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="orders-report.csv"');
    return res.send('﻿' + header + rows); // BOM để Excel đọc đúng UTF-8
  } catch (err) {
    return sendError(res, 500, err.message);
  }
};

module.exports = {
  getDashboard,
  getMonthlyRevenue,
  getUsers,
  setUserActive,
  broadcastNotification,
  getUserGrowth,
  getTopSellers,
  getTopProducts,
  getPendingSellers,
  setSellerApproval,
  getProducts,
  setProductVisibility,
  deleteReview,
  getDisputes,
  resolveDispute,
  getAuditLogs,
  exportOrdersCsv,
};
