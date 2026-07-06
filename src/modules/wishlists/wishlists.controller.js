const Wishlist = require('./wishlist.model');
const Product = require('../products/product.model');

// Get all wishlisted products for the current user
exports.getWishlist = async (req, res, next) => {
  try {
    const wishlists = await Wishlist.find({ user: req.user.sub })
      .populate('product')
      .sort({ createdAt: -1 });

    // Filter out wishlists where product might have been deleted
    const validWishlists = wishlists.filter(w => w.product != null);

    res.status(200).json({
      status: 'success',
      data: validWishlists.map(w => w.product)
    });
  } catch (error) {
    next(error);
  }
};

// Toggle a product in the wishlist
exports.toggleWishlist = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const userId = req.user.sub;

    // Verify product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        status: 'error',
        message: 'Product not found',
      });
    }

    // Check if it's already in wishlist
    const existing = await Wishlist.findOne({ user: userId, product: productId });

    if (existing) {
      // Remove from wishlist
      await existing.deleteOne();
      return res.status(200).json({
        status: 'success',
        message: 'Product removed from wishlist',
        isWishlisted: false
      });
    } else {
      // Add to wishlist
      await Wishlist.create({ user: userId, product: productId });
      return res.status(200).json({
        status: 'success',
        message: 'Product added to wishlist',
        isWishlisted: true
      });
    }
  } catch (error) {
    next(error);
  }
};

// Get a list of wishlisted product IDs for the current user
exports.getWishlistIds = async (req, res, next) => {
  try {
    const wishlists = await Wishlist.find({ user: req.user.sub }, 'product');
    const productIds = wishlists.map(w => w.product.toString());

    res.status(200).json({
      status: 'success',
      data: productIds
    });
  } catch (error) {
    next(error);
  }
};
