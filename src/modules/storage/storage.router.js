const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticate } = require('../../middleware/auth');
const { sendSuccess, sendError } = require('../../utils/response');

// Lưu file vào uploads/ — production nên dùng S3/Cloudinary
const uploadDir = path.join(__dirname, '../../../uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    cb(null, allowed.includes(file.mimetype));
  },
});

// POST /storage/images/upload — TV1 task #2, TV2 task #4
router.post('/images/upload', authenticate, upload.single('file'), (req, res) => {
  if (!req.file) return sendError(res, 400, 'No file uploaded or invalid file type (jpg/png/webp only)');
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  const url = `${baseUrl}/uploads/${req.file.filename}`;
  return sendSuccess(res, { url }, 'Uploaded', 201);
});

module.exports = router;
