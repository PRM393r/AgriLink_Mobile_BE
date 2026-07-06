const Order = require('./order.model');
const Product = require('../products/product.model');
const { sendSuccess, sendError } = require('../../utils/response');

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
    });

    // TODO TV4: gửi notification cho seller sau khi có NotificationsService
    // await createNotification(sellerId, 'order_created', `Bạn có đơn hàng mới #${order.orderCode}`)

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
    const { status, page = 1, limit = 20 } = req.query;
    const role = req.user.role;

    const filter = role === 'customer'
      ? { buyerId: req.user.sub }
      : { sellerId: req.user.sub };

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
    await order.save();

    // TODO TV4: gửi notification cho buyer khi status thay đổi

    return sendSuccess(res, order.toObject(), 'Status updated');
  } catch (err) {
    return sendError(res, 500, err.message);
  }
};

module.exports = { createOrder, getOrders, getOrderById, updateStatus };
