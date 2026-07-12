const Trace = require('./trace.model');
const { sendSuccess, sendError } = require('../../utils/response');

const getTraceByCode = async (req, res) => {
  try {
    const traceCode = decodeURIComponent(req.params.code).trim().toUpperCase();
    const trace = await Trace.findOne({ traceCode }).lean();
    if (!trace) return sendError(res, 404, 'Không tìm thấy thông tin truy xuất cho mã này');
    return sendSuccess(res, trace, 'Lấy thông tin truy xuất thành công');
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

module.exports = { getTraceByCode };
