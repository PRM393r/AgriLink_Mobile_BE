const Review = require('./review.model');
const Order = require('../orders/order.model');
const { sendSuccess, sendError } = require('../../utils/response');

// ─── GET /reviews/product/:productId ─────────────────────────────────────────
// TV2 task #8
const getProductReviews = async (req, res) => {
  try {
    const reviews = await Review.find({ productId: req.params.productId })
      .sort({ createdAt: -1 })
      .lean();
    return sendSuccess(res, reviews);
  } catch (err) {
    return sendError(res, 500, err.message);
  }
};

// ─── POST /reviews ────────────────────────────────────────────────────────────
// TV2 task #9: chỉ review sau khi đơn delivered
const createReview = async (req, res) => {
  try {
    const { productId, orderId, rating, comment } = req.body;
    if (!productId || !orderId || !rating) {
      return sendError(res, 400, 'productId, orderId, rating are required');
    }

    // Verify đơn hàng đã giao và thuộc về buyer này
    const order = await Order.findById(orderId);
    if (!order) return sendError(res, 404, 'Order not found');
    if (order.buyerId.toString() !== req.user.sub) return sendError(res, 403, 'Forbidden');
    if (order.status !== 'delivered') return sendError(res, 400, 'Can only review delivered orders');

    const review = await Review.create({
      productId, orderId, rating, comment,
      buyerId: req.user.sub,
    });
    return sendSuccess(res, review.toObject(), 'Review created', 201);
  } catch (err) {
    if (err.code === 11000) return sendError(res, 409, 'You already reviewed this product');
    return sendError(res, 500, err.message);
  }
};

module.exports = { getProductReviews, createReview };
