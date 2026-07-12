const Order = require('./order.model');
const Product = require('../products/product.model');
const User = require('../users/user.model');
const { sendSuccess, sendError } = require('../../utils/response');
const { createNotification } = require('../notifications/notifications.controller');
const { startOrderTracking } = require('../tracking/tracking.socket');

const STATUS_LABELS = {
  confirmed:  'Đã xác nhận',
  preparing:  'Đang chuẩn bị',
  shipping:   'Đang giao hàng',
  delivered:  'Đã giao hàng',
  cancelled:  'Đã hủy',
};

// ─── POST /orders ────────────────────────────────────────────────────────────
// TV3 task #2: Tạo đơn hàng từ cart
const createOrder = async (req, res) => {
  try {
    const { items, shippingAddressSnapshot, note, paymentMethod = 'cod' } = req.body;

    if (!items || !items.length) return sendError(res, 400, 'items is required');
    if (!shippingAddressSnapshot?.address) return sendError(res, 400, 'shippingAddressSnapshot.address is required');

    // Nhóm sản phẩm theo seller: một checkout có thể tạo nhiều order con.
    const groups = new Map();
    for (const item of items) {
      const product = await Product.findById(item.productId).lean();
      if (!product) return sendError(res, 404, `Product ${item.productId} not found`);
      const unitPrice = product.pricePerUnit;
      const totalPrice = unitPrice * item.quantity;
      const sellerId = product.sellerId.toString();
      if (!groups.has(sellerId)) groups.set(sellerId, { sellerId, subtotal: 0, items: [] });
      const group = groups.get(sellerId);
      group.subtotal += totalPrice;
      group.items.push({
        productId: product._id,
        productSnapshot: {
          name: product.name,
          pricePerUnit: product.pricePerUnit,
          unit: product.unit,
          imageUrl: product.images?.[0]?.url || '',
        },
        quantity: item.quantity,
        unitPrice,
        totalPrice,
      });
    }

    // Validate tất cả seller trước khi tạo order để tránh tạo dở dang.
    for (const group of groups.values()) {
      const seller = await User.findById(group.sellerId).lean();
      if (!seller) return sendError(res, 404, 'Seller not found');
      group.seller = seller;
      if (paymentMethod === 'bank_transfer') {
        const bank = seller.bankInfo || {};
        if (!bank.bankCode || !bank.accountNumber || !bank.accountName) {
          return sendError(res, 400, `Người bán ${seller.fullName || group.sellerId} chưa thiết lập thông tin nhận chuyển khoản`);
        }
      }
    }

    const createdOrders = [];
    for (const group of groups.values()) {
      const shippingFee = 0;
      const order = await Order.create({
        buyerId: req.user.sub,
        sellerId: group.sellerId,
        items: group.items,
        shippingAddressSnapshot,
        subtotal: group.subtotal,
        shippingFee,
        totalAmount: group.subtotal + shippingFee,
        paymentMethod,
        paymentRecipient: paymentMethod === 'bank_transfer'
          ? {
              bankCode: group.seller.bankInfo.bankCode,
              accountNumber: group.seller.bankInfo.accountNumber,
              accountName: group.seller.bankInfo.accountName,
            }
          : undefined,
        note,
        statusHistory: [{ status: 'pending', changedAt: new Date() }],
      });
      await Promise.all([
        createNotification(
          group.sellerId,
          'order_created',
          'Có khách đặt hàng',
          `Bạn có đơn hàng mới #${order.orderCode} (${group.items.length} sản phẩm)`,
          { orderId: order._id.toString(), orderCode: order.orderCode }
        ),
        createNotification(
          req.user.sub,
          'order_created',
          'Đặt hàng thành công',
          `Đơn hàng #${order.orderCode} đã được tạo và đang chờ người bán xác nhận.`,
          { orderId: order._id.toString(), orderCode: order.orderCode }
        ),
      ]);
      createdOrders.push(order.toObject());
    }

    // Giữ response cũ cho checkout một seller; trả danh sách khi có nhiều seller.
    const responseData = createdOrders.length === 1
      ? createdOrders[0]
      : { orders: createdOrders, totalOrders: createdOrders.length };
    return sendSuccess(res, responseData, `${createdOrders.length} order(s) created`, 201);
  } catch (err) {
    return sendError(res, 500, err.message);
  }
};

// ─── GET /orders ──────────────────────────────────────────────────────────────
// TV3 task #4, TV3 task #6
// Customer: xem đơn mình đặt. Seller: xem đơn mình nhận
const getOrders = async (req, res) => {
  try {
    const { status, page = 1, limit = 20, role: queryRole } = req.query;
    const userRole = req.user.role;

    // queryRole=buyer → luôn filter buyerId (farmer/supplier cũng có thể mua)
    // queryRole=seller → filter sellerId
    // Mặc định: customer → buyer, farmer/supplier → seller
    let filter;
    if (queryRole === 'buyer') {
      filter = { buyerId: req.user.sub };
    } else if (queryRole === 'seller') {
      filter = { sellerId: req.user.sub };
    } else {
      filter = userRole === 'customer'
        ? { buyerId: req.user.sub }
        : { sellerId: req.user.sub };
    }

    if (status) filter.status = status;

    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      Order.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Order.countDocuments(filter),
    ]);

    return sendSuccess(res, { items, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    return sendError(res, 500, err.message);
  }
};

// ─── GET /orders/:id ──────────────────────────────────────────────────────────
// TV3 task #5
const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).lean();
    if (!order) return sendError(res, 404, 'Order not found');

    const userId = req.user.sub;
    const isBuyer = order.buyerId.toString() === userId;
    const isSeller = order.sellerId.toString() === userId;
    if (!isBuyer && !isSeller) return sendError(res, 403, 'Forbidden');

    return sendSuccess(res, order);
  } catch (err) {
    return sendError(res, 500, err.message);
  }
};

// ─── PATCH /orders/:id/status ─────────────────────────────────────────────────
// TV3 task #6: Seller xác nhận / hủy đơn
const updateStatus = async (req, res) => {
  try {
    const { status, cancelReason } = req.body;
    const ALLOWED_STATUS = ['confirmed', 'preparing', 'shipping', 'delivered', 'cancelled'];
    if (!ALLOWED_STATUS.includes(status)) {
      return sendError(res, 400, `status must be one of: ${ALLOWED_STATUS.join(', ')}`);
    }

    const order = await Order.findById(req.params.id);
    if (!order) return sendError(res, 404, 'Order not found');
    if (order.sellerId.toString() !== req.user.sub) {
      return sendError(res, 403, 'Forbidden: not your order');
    }

    order.status = status;
    if (status === 'cancelled' && cancelReason) order.cancelReason = cancelReason;
    order.statusHistory.push({ status, changedAt: new Date() });
    await order.save();

    // Start GPS tracking simulation when order starts shipping
    if (status === 'shipping') {
      startOrderTracking(order._id.toString());
    }

    // Notify buyer: status thay đổi
    const label = STATUS_LABELS[status] ?? status;
    await createNotification(
      order.buyerId.toString(),
      `order_${status}`,
      `Đơn hàng ${label}`,
      `Đơn hàng #${order.orderCode} của bạn đã ${label.toLowerCase()}.`,
      { orderId: order._id.toString(), orderCode: order.orderCode, status }
    );

    return sendSuccess(res, order.toObject(), 'Status updated');
  } catch (err) {
    return sendError(res, 500, err.message);
  }
};

// ─── PATCH /orders/:id/payment-confirm ──────────────────────────────────────
// MVP: người mua xác nhận đã hoàn tất QR chuyển khoản/VNPay.
const confirmPayment = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return sendError(res, 404, 'Order not found');
    if (order.buyerId.toString() !== req.user.sub) {
      return sendError(res, 403, 'Forbidden: not your order');
    }
    if (!['bank_transfer', 'vnpay', 'payos'].includes(order.paymentMethod)) {
      return sendError(res, 400, 'Payment confirmation is not required for this method');
    }

    order.paymentStatus = 'paid';
    await order.save();
    await createNotification(
      order.sellerId.toString(),
      'system',
      'Đơn hàng đã thanh toán',
      `Đơn hàng #${order.orderCode} đã được người mua xác nhận thanh toán.`,
      { orderId: order._id.toString(), orderCode: order.orderCode }
    );

    return sendSuccess(res, order.toObject(), 'Payment confirmed');
  } catch (err) {
    return sendError(res, 500, err.message);
  }
};

// ─── GET /orders/seller-stats ──────────────────────────────────────────────────
// TV2 task #1: Thống kê Dashboard cho Seller
const getSellerStats = async (req, res) => {
  try {
    const sellerId = req.user.sub;

    const [totalRevenueResult, totalOrders, pendingOrders, totalProducts] = await Promise.all([
      // Tổng doanh thu từ các đơn hàng 'delivered'
      Order.aggregate([
        { $match: { sellerId, status: 'delivered' } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ]),
      // Tổng số đơn hàng
      Order.countDocuments({ sellerId }),
      // Số đơn hàng đang xử lý
      Order.countDocuments({ sellerId, status: { $in: ['confirmed', 'preparing', 'pending'] } }),
      // Tổng số sản phẩm
      Product.countDocuments({ sellerId }),
    ]);

    const totalRevenue = totalRevenueResult[0]?.total || 0;

    return sendSuccess(res, {
      totalRevenue,
      totalOrders,
      pendingOrders,
      totalProducts
    });
  } catch (err) {
    return sendError(res, 500, err.message);
  }
};

// ─── GET /orders/seller-stats/monthly ───────────────────────────────────────────
const getMonthlyRevenue = async (req, res) => {
  try {
    const sellerId = req.user.sub;
    const { type } = req.query; // 'daily' or 'monthly'
    const now = new Date();
    const currentYear = now.getFullYear();

    if (type === 'daily') {
      const currentMonth = now.getMonth() + 1; // 1-12
      // Số ngày trong tháng hiện tại
      const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
      
      const stats = await Order.aggregate([
        {
          $match: {
            sellerId,
            status: 'delivered',
            createdAt: {
              $gte: new Date(`${currentYear}-${currentMonth.toString().padStart(2, '0')}-01T00:00:00.000Z`),
              $lte: new Date(`${currentYear}-${currentMonth.toString().padStart(2, '0')}-${daysInMonth}T23:59:59.999Z`)
            }
          }
        },
        {
          $group: {
            _id: { $dayOfMonth: "$createdAt" },
            revenue: { $sum: "$totalAmount" }
          }
        },
        { $sort: { _id: 1 } }
      ]);

      const formattedStats = Array.from({ length: daysInMonth }, (_, i) => {
        const dayStat = stats.find(s => s._id === i + 1);
        return {
          label: i + 1,
          revenue: dayStat ? dayStat.revenue : 0
        };
      });

      return sendSuccess(res, formattedStats);
    }

    // Default to monthly
    const stats = await Order.aggregate([
      {
        $match: {
          sellerId,
          status: 'delivered',
          createdAt: {
            $gte: new Date(`${currentYear}-01-01T00:00:00.000Z`),
            $lte: new Date(`${currentYear}-12-31T23:59:59.999Z`)
          }
        }
      },
      {
        $group: {
          _id: { $month: "$createdAt" },
          revenue: { $sum: "$totalAmount" }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const formattedStats = Array.from({ length: 12 }, (_, i) => {
      const monthStat = stats.find(s => s._id === i + 1);
      return {
        label: i + 1,
        revenue: monthStat ? monthStat.revenue : 0
      };
    });

    return sendSuccess(res, formattedStats);
  } catch (err) {
    return sendError(res, 500, err.message);
  }
};

module.exports = { createOrder, getOrders, getOrderById, updateStatus, confirmPayment, getSellerStats, getMonthlyRevenue };

