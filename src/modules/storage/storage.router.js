const router = require('express').Router();
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;
const { authenticate } = require('../../middleware/auth');
const { sendSuccess, sendError } = require('../../utils/response');

// Cấu hình Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'agrilink_mobile_products',
    allowed_formats: ['jpg', 'png', 'webp', 'jpeg'],
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

// POST /storage/images/upload — TV1 task #2, TV2 task #4
router.post('/images/upload', authenticate, upload.single('file'), (req, res) => {
  if (!req.file) return sendError(res, 400, 'No file uploaded or invalid file type (jpg/png/webp only)');
  
  // Cloudinary trả về secure_url trong req.file.path
  const url = req.file.path;
  return sendSuccess(res, { url }, 'Uploaded', 201);
});

module.exports = router;
