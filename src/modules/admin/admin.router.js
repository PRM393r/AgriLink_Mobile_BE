const router = require('express').Router();
const { authenticate, authorize } = require('../../middleware/auth');
const ctrl = require('./admin.controller');

router.use(authenticate, authorize('admin'));

router.get('/dashboard', ctrl.getDashboard);
router.get('/revenue/monthly', ctrl.getMonthlyRevenue);
router.get('/analytics/user-growth', ctrl.getUserGrowth);
router.get('/analytics/top-sellers', ctrl.getTopSellers);
router.get('/analytics/top-products', ctrl.getTopProducts);

router.get('/users', ctrl.getUsers);
router.patch('/users/:id/active', ctrl.setUserActive);

router.get('/sellers/pending', ctrl.getPendingSellers);
router.patch('/sellers/:id/approval', ctrl.setSellerApproval);

router.get('/products', ctrl.getProducts);
router.patch('/products/:id/visibility', ctrl.setProductVisibility);

router.delete('/reviews/:id', ctrl.deleteReview);

router.get('/disputes', ctrl.getDisputes);
router.patch('/disputes/:id', ctrl.resolveDispute);

router.get('/audit-logs', ctrl.getAuditLogs);

router.get('/reports/orders.csv', ctrl.exportOrdersCsv);

router.post('/notifications/broadcast', ctrl.broadcastNotification);

module.exports = router;
