const router = require('express').Router();
const { authenticate } = require('../../middleware/auth');
const ctrl = require('./notifications.controller');

// TV4 task #1, #2, #4
router.get('/', authenticate, ctrl.getNotifications);
router.patch('/read-all', authenticate, ctrl.markAllAsRead);  // phải trước /:id để không bị shadow
router.patch('/:id/read', authenticate, ctrl.markAsRead);

module.exports = router;
