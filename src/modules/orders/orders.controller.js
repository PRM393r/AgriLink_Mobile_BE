const Order = require('./order.model');
const Product = require('../products/product.model');
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

    // Lấy thông tin sản phẩm để lấy sellerId và snapshot
    const firstProduct = await Product.findById(items[0].productId);
    if (!firstProduct) return sendError(res, 404, 'Product not found');

    const sellerId = firstProduct.sellerId;

    // Build order items với snapshot
    const orderItems = [];
    let subtotal = 0;
    for (const item of items) {
      const product = await Product.findById(item.productId).lean();
      if (!product) return sendError(res, 404, `Product ${item.productId} not found`);
      const unitPrice = product.pricePerUnit;
      const totalPrice = unitPrice * item.quantity;
      subtotal += totalPrice;
      orderItems.push({
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

    const shippingFee = 0; // MVP: miễn phí vận chuyển
    const totalAmount = subtotal + shippingFee;

    const order = await Order.create({
      buyerId: req.user.sub,
      sellerId,
      items: orderItems,
      shippingAddressSnapshot,
      subtotal,
      shippingFee,
      totalAmount,
      paymentMethod,
      note,
      statusHistory: [{ status: 'pending', changedAt: new Date() }],
    });

    // Notify seller: đơn hàng mới
    createNotification(
      sellerId.toString(),
      'order_created',
      'Đơn hàng mới',
      `Bạn có đơn hàng mới #${order.orderCode} (${orderItems.length} sản phẩm)`,
      { orderId: order._id.toString(), orderCode: order.orderCode }
    ).catch(() => {});

    return sendSuccess(res, order.toObject(), 'Order created', 201);
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
    createNotification(
      order.buyerId.toString(),
      `order_${status}`,
      `Đơn hàng ${label}`,
      `Đơn hàng #${order.orderCode} của bạn đã ${label.toLowerCase()}.`,
      { orderId: order._id.toString(), orderCode: order.orderCode, status }
    ).catch(() => {});

    return sendSuccess(res, order.toObject(), 'Status updated');
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

module.exports = { createOrder, getOrders, getOrderById, updateStatus, getSellerStats, getMonthlyRevenue };

