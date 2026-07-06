const router = require('express').Router();
const { authenticate } = require('../../middleware/auth');
const ctrl = require('./users.controller');

// TV1 tasks: GET /users/me, PATCH /users/me, PUT /users/me/role
router.get('/me', authenticate, ctrl.getMe);
router.patch('/me', authenticate, ctrl.updateMe);
router.put('/me/role', authenticate, ctrl.updateRole); // TV1 task #5 — BE cũ thiếu endpoint này

module.exports = router;
