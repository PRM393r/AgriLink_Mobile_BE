const router = require('express').Router();
const { authenticate, authorize } = require('../../middleware/auth');
const ctrl = require('./orders.controller');

// All authenticated
router.post('/', authenticate, authorize('customer'), ctrl.createOrder);          // TV3 task #2
router.get('/', authenticate, ctrl.getOrders);                                    // TV3 task #4 + #6
router.get('/:id', authenticate, ctrl.getOrderById);                              // TV3 task #5
router.patch('/:id/status', authenticate, authorize('farmer', 'supplier'), ctrl.updateStatus); // TV3 task #6

module.exports = router;
