const Product = require('./product.model');
const User = require('../users/user.model');
const { sendSuccess, sendError } = require('../../utils/response');

// ─── GET /products ────────────────────────────────────────────────────────────
// TV2 task #1: GET /products?sellerId=me
// Params: page, limit, category, province, farmingType, status, sortBy, order, sellerId, search
const getProducts = async (req, res) => {
  try {
    const {
      page = 1, limit = 20, category, province, farmingType,
      status, sellerId, search, sortBy = 'createdAt', order = 'desc',
    } = req.query;

    const filter = {};

    // Nếu không có auth hoặc không filter sellerId thì chỉ show active
    if (sellerId) {
      filter.sellerId = sellerId === 'me' ? req.user?.sub : sellerId;
    } else {
      filter.status = status || 'active';
    }

    if (category) filter.category = { $regex: category, $options: 'i' };
    if (province) filter.province = province;
    if (farmingType) filter.farmingType = farmingType;
    if (status && sellerId) filter.status = status;
    if (search) filter.$text = { $search: search };

    const skip = (Number(page) - 1) * Number(limit);
    const sortOrder = order === 'asc' ? 1 : -1;

    const [items, total] = await Promise.all([
      Product.find(filter)
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(Number(limit))
        .populate('sellerId', 'fullName')
        .lean(),
      Product.countDocuments(filter),
    ]);

    return sendSuccess(res, { items, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    return sendError(res, 500, err.message);
  }
};

// ─── GET /products/categories ────────────────────────────────────────────────
// TV2 task #10: category list
const getCategories = async (req, res) => {
  const CATEGORIES = [
    'Rau củ quả', 'Trái cây', 'Lúa gạo & Ngũ cốc', 'Thủy sản',
    'Gia súc & Gia cầm', 'Cà phê & Chè', 'Gia vị & Thảo mộc',
    'Hạt & Đậu', 'Mật ong & Đặc sản', 'Hoa & Cây cảnh',
    'Nông cụ & Máy móc', 'Phân bón & Thuốc BVTV', 'Hạt giống & Cây giống',
  ];
  return sendSuccess(res, CATEGORIES);
};

// ─── GET /products/categories/tree ───────────────────────────────────────────
const getCategoryTree = async (req, res) => {
  const CATEGORY_TREE = [
    {
      name: 'Nông sản tươi',
      children: ['Rau củ quả', 'Trái cây', 'Hoa & Cây cảnh']
    },
    {
      name: 'Thực phẩm khô & chế biến',
      children: ['Lúa gạo & Ngũ cốc', 'Cà phê & Chè', 'Hạt & Đậu', 'Mật ong & Đặc sản', 'Gia vị & Thảo mộc']
    },
    {
      name: 'Thủy hải sản & Thịt',
      children: ['Thủy sản', 'Gia súc & Gia cầm']
    },
    {
      name: 'Vật tư nông nghiệp',
      children: ['Nông cụ & Máy móc', 'Phân bón & Thuốc BVTV', 'Hạt giống & Cây giống']
    }
  ];
  return sendSuccess(res, CATEGORY_TREE);
};


// ─── GET /products/:id ────────────────────────────────────────────────────────
const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).lean();
    if (!product) return sendError(res, 404, 'Product not found');
    // Tăng view count async
    Product.findByIdAndUpdate(req.params.id, { $inc: { viewCount: 1 } }).exec();
    return sendSuccess(res, product);
  } catch (err) {
    return sendError(res, 500, err.message);
  }
};

// ─── POST /products ───────────────────────────────────────────────────────────
// TV2 task #2
const createProduct = async (req, res) => {
  try {
    const seller = await User.findById(req.user.sub).select('sellerApprovalStatus').lean();
    if (seller?.sellerApprovalStatus === 'pending') {
      return sendError(res, 403, 'Tài khoản của bạn đang chờ admin duyệt. Vui lòng chờ trước khi đăng bán sản phẩm.');
    }
    if (seller?.sellerApprovalStatus === 'rejected') {
      return sendError(res, 403, 'Tài khoản bán hàng của bạn đã bị từ chối. Vui lòng liên hệ hỗ trợ.');
    }

    const sellerType = req.user.role === 'farmer' ? 'farmer' : 'supplier';
    const product = await Product.create({
      ...req.body,
      sellerId: req.user.sub,
      sellerType,
    });
    return sendSuccess(res, product.toObject(), 'Product created', 201);
  } catch (err) {
    return sendError(res, 400, err.message);
  }
};

// ─── PATCH /products/:id ─────────────────────────────────────────────────────
// TV2 task #3
const updateProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return sendError(res, 404, 'Product not found');
    if (product.sellerId.toString() !== req.user.sub) {
      return sendError(res, 403, 'Forbidden: not your product');
    }
    const ALLOWED = ['name','description','category','pricePerUnit','unit',
      'availableQuantity','minOrderQuantity','status','farmingType',
      'province','harvestDate','expiryDate','certifications','images'];
    const update = {};
    for (const k of ALLOWED) if (req.body[k] !== undefined) update[k] = req.body[k];
    Object.assign(product, update);
    await product.save();
    return sendSuccess(res, product.toObject());
  } catch (err) {
    return sendError(res, 400, err.message);
  }
};

// ─── DELETE /products/:id ────────────────────────────────────────────────────
// TV2 task #5
const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return sendError(res, 404, 'Product not found');
    if (product.sellerId.toString() !== req.user.sub) {
      return sendError(res, 403, 'Forbidden: not your product');
    }
    await product.deleteOne();
    return sendSuccess(res, null, 'Product deleted');
  } catch (err) {
    return sendError(res, 500, err.message);
  }
};

// ─── POST /products/:id/images ────────────────────────────────────────────────
// TV2 task #4 — thêm image URL sau khi upload qua /storage
const addImage = async (req, res) => {
  try {
    const { url, isPrimary = false } = req.body;
    if (!url) return sendError(res, 400, 'url is required');

    const product = await Product.findById(req.params.id);
    if (!product) return sendError(res, 404, 'Product not found');
    if (product.sellerId.toString() !== req.user.sub) {
      return sendError(res, 403, 'Forbidden: not your product');
    }

    if (isPrimary) {
      product.images.forEach((img) => (img.isPrimary = false));
    }
    product.images.push({ url, isPrimary });
    await product.save();
    return sendSuccess(res, product.images[product.images.length - 1], 'Image added', 201);
  } catch (err) {
    return sendError(res, 500, err.message);
  }
};

module.exports = {
  getProducts,
  getCategories,
  getCategoryTree,
  getProductById, createProduct, updateProduct, deleteProduct, addImage };
