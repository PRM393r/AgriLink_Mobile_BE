/**
 * Chuẩn hoá response format cho toàn bộ API.
 * Mobile đang expect: { statusCode, data, message }
 */
const sendSuccess = (res, data, message = 'Success', statusCode = 200) => {
  return res.status(statusCode).json({ statusCode, data, message });
};

const sendError = (res, statusCode = 500, message = 'Internal Server Error', errors = null) => {
  const body = { statusCode, message };
  if (errors) body.errors = errors;
  return res.status(statusCode).json(body);
};

module.exports = { sendSuccess, sendError };
