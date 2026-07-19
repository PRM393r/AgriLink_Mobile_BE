const { PayOS } = require('@payos/node');

// Client khởi tạo lazy: nếu thiếu key (chưa điền .env), giữ null để controller tự báo lỗi rõ ràng
// thay vì crash lúc boot app.
let payos = null;

const isConfigured = () =>
  Boolean(process.env.PAYOS_CLIENT_ID && process.env.PAYOS_API_KEY && process.env.PAYOS_CHECKSUM_KEY);

const getPayOSClient = () => {
  if (!isConfigured()) return null;
  if (!payos) {
    payos = new PayOS({
      clientId: process.env.PAYOS_CLIENT_ID,
      apiKey: process.env.PAYOS_API_KEY,
      checksumKey: process.env.PAYOS_CHECKSUM_KEY,
    });
  }
  return payos;
};

module.exports = { getPayOSClient, isConfigured };
