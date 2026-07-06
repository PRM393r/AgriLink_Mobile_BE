const router = require('express').Router();
const { authenticate } = require('../../middleware/auth');
const ctrl = require('./reviews.controller');

router.get('/product/:productId', ctrl.getProductReviews);             // TV2 task #8 — public
router.post('/', authenticate, ctrl.createReview);                     // TV2 task #9

module.exports = router;
