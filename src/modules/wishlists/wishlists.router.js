const express = require('express');
const wishlistsController = require('./wishlists.controller');
const { authenticate } = require('../../middleware/auth');

const router = express.Router();

router.use(authenticate); // All wishlist routes require authentication

router
  .route('/')
  .get(wishlistsController.getWishlist);

router
  .route('/ids')
  .get(wishlistsController.getWishlistIds);

router
  .route('/toggle/:productId')
  .post(wishlistsController.toggleWishlist);

module.exports = router;
