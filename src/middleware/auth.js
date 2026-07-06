const jwt = require('jsonwebtoken');
const { sendError } = require('../utils/response');

/**
 * Verify access token từ Authorization: Bearer <token>
 * Attach decoded payload vào req.user = { sub, email, role }
 */
const authenticate = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return sendError(res, 401, 'Missing or invalid Authorization header');
  }
  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload;
    next();
  } catch {
    return sendError(res, 401, 'Token invalid or expired');
  }
};

/**
 * Require specific roles.
 * Usage: authorize('farmer', 'supplier')
 */
const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user?.role)) {
    return sendError(res, 403, 'Forbidden: insufficient role');
  }
  next();
};

module.exports = { authenticate, authorize };
