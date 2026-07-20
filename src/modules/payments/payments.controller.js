const Order = require('../orders/order.model');
const { sendSuccess, sendError } = require('../../utils/response');
const { createNotification } = require('../notifications/notifications.controller');
const { getPayOSClient, isConfigured } = require('../../config/payos');

// PayOS orderCode phải là số nguyên dương, unique, và tối đa an toàn trong Number (< 2^53).
// Dùng timestamp(ms) * 1000 + random 3 chữ số để tránh đụng nhau khi tạo cùng lúc.
const generatePayosOrderCode = () => Number(`${Date.now()}${Math.floor(Math.random() * 900 + 100)}`);

// ─── POST /payments/payos/orders/:orderId ────────────────────────────────────
// Tạo payment link PayOS cho 1 order đã tồn tại (paymentMethod=payos, chưa thanh toán).
const createPaymentLink = async (req, res) => {
  try {
    if (!isConfigured()) {
      return sendError(res, 503, 'Cổng thanh toán PayOS chưa được cấu hình. Vui lòng liên hệ quản trị viên.');
    }
    const payos = getPayOSClient();

    const order = await Order.findById(req.params.orderId);
    if (!order) return sendError(res, 404, 'Order not found');
    if (order.buyerId.toString() !== req.user.sub) {
      return sendError(res, 403, 'Forbidden: not your order');
    }
    if (order.paymentStatus === 'paid') {
      return sendError(res, 400, 'Đơn hàng đã được thanh toán');
    }

    // Nếu đã có link còn hiệu lực thì trả lại luôn, tránh sinh trùng orderCode ở PayOS.
    if (order.payosCheckoutUrl && order.payosOrderCode) {
      return sendSuccess(res, {
        checkoutUrl: order.payosCheckoutUrl,
        payosOrderCode: order.payosOrderCode,
        paymentLinkId: order.payosPaymentLinkId,
      }, 'Payment link');
    }

    const payosOrderCode = generatePayosOrderCode();
    // Deep link mặc định đưa buyer quay lại app mobile (agrilink://payment-result) thay vì 1 domain web chưa tồn tại.
    const returnUrl = process.env.PAYOS_RETURN_URL || 'agrilink://payment-result?status=success';
    const cancelUrl = process.env.PAYOS_CANCEL_URL || 'agrilink://payment-result?status=cancel';

    const paymentLink = await payos.paymentRequests.create({
      orderCode: payosOrderCode,
      amount: Math.round(order.totalAmount),
      description: `Thanh toan ${order.orderCode}`.slice(0, 25), // PayOS giới hạn description 25 ký tự
      returnUrl,
      cancelUrl,
      items: order.items.map((i) => ({
        name: i.productSnapshot?.name || 'Sản phẩm',
        quantity: i.quantity,
        price: Math.round(i.unitPrice),
      })),
    });

    order.paymentMethod = 'payos';
    order.payosOrderCode = payosOrderCode;
    order.payosPaymentLinkId = paymentLink.paymentLinkId;
    order.payosCheckoutUrl = paymentLink.checkoutUrl;
    await order.save();

    return sendSuccess(res, {
      checkoutUrl: paymentLink.checkoutUrl,
      qrCode: paymentLink.qrCode,
      payosOrderCode,
      paymentLinkId: paymentLink.paymentLinkId,
    }, 'Payment link created', 201);
  } catch (err) {
    return sendError(res, 500, err.message);
  }
};

// ─── POST /payments/payos/webhook ────────────────────────────────────────────
// Endpoint public (không auth) — PayOS gọi để báo kết quả thanh toán.
// Bắt buộc verify signature qua SDK trước khi tin dữ liệu.
const handleWebhook = async (req, res) => {
  try {
    if (!isConfigured()) return sendError(res, 503, 'PayOS not configured');
    const payos = getPayOSClient();

    // webhooks.verify ném lỗi nếu signature sai → coi là request giả mạo.
    const webhookData = await payos.webhooks.verify(req.body);

    const order = await Order.findOne({ payosOrderCode: webhookData.orderCode });
    if (!order) {
      // Vẫn trả 200 để PayOS không retry vô hạn cho order không xác định (vd test webhook của PayOS dashboard).
      return sendSuccess(res, null, 'Order not found for this payosOrderCode');
    }

    if (webhookData.code === '00' && order.paymentStatus !== 'paid') {
      order.paymentStatus = 'paid';
      await order.save();
      await createNotification(
        order.sellerId.toString(),
        'system',
        'Đơn hàng đã thanh toán',
        `Đơn hàng #${order.orderCode} đã được thanh toán qua PayOS.`,
        { orderId: order._id.toString(), orderCode: order.orderCode }
      );
      await createNotification(
        order.buyerId.toString(),
        'system',
        'Thanh toán thành công',
        `Bạn đã thanh toán thành công đơn hàng #${order.orderCode}.`,
        { orderId: order._id.toString(), orderCode: order.orderCode }
      );
    }

    return sendSuccess(res, null, 'Webhook received');
  } catch (err) {
    return sendError(res, 400, `Invalid webhook: ${err.message}`);
  }
};

// ─── GET /payments/payos/orders/:orderId/status ──────────────────────────────
// Mobile poll trạng thái sau khi quay lại từ trình duyệt (return/cancel URL không đủ tin cậy để tự confirm).
const getPaymentStatus = async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId).lean();
    if (!order) return sendError(res, 404, 'Order not found');
    if (order.buyerId.toString() !== req.user.sub) {
      return sendError(res, 403, 'Forbidden: not your order');
    }
    return sendSuccess(res, { paymentStatus: order.paymentStatus, orderStatus: order.status });
  } catch (err) {
    return sendError(res, 500, err.message);
  }
};

module.exports = { createPaymentLink, handleWebhook, getPaymentStatus };
