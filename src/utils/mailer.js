const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST || 'smtp.gmail.com',
  port: Number(process.env.MAIL_PORT) || 587,
  secure: false, // STARTTLS
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

/**
 * Gửi OTP xác thực email.
 * Dev (không có MAIL_USER): log ra console thay vì gửi thật.
 */
const sendOtpEmail = async (to, code) => {
  if (!process.env.MAIL_USER) {
    console.log(`[MAIL DEV] OTP for ${to}: ${code}`);
    return;
  }
  await transporter.sendMail({
    from: process.env.MAIL_FROM || process.env.MAIL_USER,
    to,
    subject: 'AgriLink — Mã xác thực email',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto">
        <h2 style="color:#2d7a2d">AgriLink</h2>
        <p>Mã xác thực email của bạn:</p>
        <div style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#2d7a2d;margin:24px 0">${code}</div>
        <p style="color:#888">Mã có hiệu lực trong <strong>10 phút</strong>. Không chia sẻ mã này với ai.</p>
      </div>
    `,
  });
};

module.exports = { sendOtpEmail };
