const router = require('express').Router();
const { authenticate, authorize } = require('../../middleware/auth');
const ctrl = require('./products.controller');

// Public
router.get('/categories', ctrl.getCategories);              // TV2 task #10
router.get('/', ctrl.getProducts);                          // TV2 task #1 — public list
router.get('/:id', ctrl.getProductById);

// Farmer / Supplier only
router.post('/', authenticate, authorize('farmer', 'supplier'), ctrl.createProduct);       // TV2 task #2
router.patch('/:id', authenticate, authorize('farmer', 'supplier'), ctrl.updateProduct);   // TV2 task #3
router.delete('/:id', authenticate, authorize('farmer', 'supplier'), ctrl.deleteProduct);  // TV2 task #5
router.post('/:id/images', authenticate, authorize('farmer', 'supplier'), ctrl.addImage);  // TV2 task #4

module.exports = router;
