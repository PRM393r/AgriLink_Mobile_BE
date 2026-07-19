const router = require('express').Router();
const { authenticate, authorize } = require('../../middleware/auth');
const ctrl = require('./payments.controller');

// Webhook PayOS gọi trực tiếp — không có JWT, verify bằng checksum signature trong controller.
router.post('/payos/webhook', ctrl.handleWebhook);

router.post('/payos/orders/:orderId', authenticate, authorize('customer'), ctrl.createPaymentLink);
router.get('/payos/orders/:orderId/status', authenticate, authorize('customer'), ctrl.getPaymentStatus);

module.exports = router;
