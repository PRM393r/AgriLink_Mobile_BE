# AgriLink Mobile Backend

Express.js + MongoDB backend cho AgriLink Mobile (PRM393).

**Port:** `5000` | **Base URL:** `http://localhost:5000/api/v1`

## Khởi động

```bash
# 1. Cài dependencies
npm install

# 2. Copy .env
cp .env.example .env
# Điền MONGODB_URI, JWT_SECRET, REFRESH_SECRET, MAIL_USER, MAIL_PASS

# 3. Chạy dev (hot reload)
npm run dev
```

MongoDB cần chạy trước. Dùng [MongoDB Community](https://www.mongodb.com/try/download/community) hoặc [MongoDB Atlas](https://cloud.mongodb.com/).

---

## Flow đăng ký / đăng nhập

```
Đăng ký:
  POST /auth/register   { email, password, fullName }
    → gửi OTP 6 số về email (dev: log console, code luôn là 123456)
  POST /auth/verify-email  { email, code }
    → isVerified = true
  PUT  /users/me/role   { role: "farmer|supplier|customer" }   🔒
    → chọn role sau khi có accessToken từ bước verify

Đăng nhập:
  POST /auth/login  { email, password }
    → { accessToken, refreshToken, user }
```

---

## API Endpoints

### Auth
| Method | Endpoint | Mô tả |
|---|---|---|
| POST | `/auth/register` | Tạo tài khoản + gửi OTP email |
| POST | `/auth/verify-email` | Xác nhận OTP → mở khoá tài khoản |
| POST | `/auth/resend-otp` | Gửi lại OTP (nếu hết hạn) |
| POST | `/auth/login` | Đăng nhập email + password → token pair |
| POST | `/auth/refresh` | Đổi refresh token → token pair mới |
| POST | `/auth/logout` | 🔒 Revoke refresh token |

### Users
| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/users/me` | 🔒 Lấy profile |
| PATCH | `/users/me` | 🔒 Cập nhật profile (fullName, avatarUrl, address) |
| PUT | `/users/me/role` | 🔒 Chọn / đổi role (farmer\|supplier\|customer) |

### Products
| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/products` | Danh sách (filter: category, province, farmingType, sellerId, search, page, limit) |
| GET | `/products/categories` | Danh mục tĩnh |
| GET | `/products/:id` | Chi tiết |
| POST | `/products` | 🔒 (farmer/supplier) Tạo |
| PATCH | `/products/:id` | 🔒 (farmer/supplier) Sửa |
| DELETE | `/products/:id` | 🔒 (farmer/supplier) Xóa |
| POST | `/products/:id/images` | 🔒 (farmer/supplier) Thêm ảnh URL |

### Orders
| Method | Endpoint | Mô tả |
|---|---|---|
| POST | `/orders` | 🔒 (customer) Tạo đơn hàng |
| GET | `/orders` | 🔒 Xem đơn (customer → đơn mình, seller → đơn nhận) |
| GET | `/orders/:id` | 🔒 Chi tiết đơn |
| PATCH | `/orders/:id/status` | 🔒 (farmer/supplier) Xác nhận/hủy |

### Reviews
| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/reviews/product/:productId` | Đánh giá sản phẩm (public) |
| POST | `/reviews` | 🔒 Gửi review (cần orderId đã delivered) |

### Notifications
| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/notifications` | 🔒 Danh sách + unreadCount |
| PATCH | `/notifications/read-all` | 🔒 Đánh dấu tất cả đã đọc |
| PATCH | `/notifications/:id/read` | 🔒 Đánh dấu 1 thông báo |

### Storage
| Method | Endpoint | Mô tả |
|---|---|---|
| POST | `/storage/images/upload` | 🔒 Upload ảnh (multipart, field: `file`) → `{ url }` |

🔒 = cần `Authorization: Bearer <accessToken>`

---

## Response Format

```json
{
  "statusCode": 200,
  "data": { ... },
  "message": "Success"
}
```

---

## Email (Nodemailer)

- **Dev:** nếu `MAIL_USER` trống → OTP log ra console, code luôn là `123456`
- **Production:** dùng Gmail App Password (16 ký tự, không phải mật khẩu thường)
  - Google Account → Security → 2-Step Verification → App Passwords

---

## Phân công task tracker (PRM393)

| TV | Task | Endpoint |
|---|---|---|
| TV1 | Đăng ký, Verify email, Đăng nhập | `/auth/register`, `/auth/verify-email`, `/auth/login` |
| TV1 | Profile edit, Avatar upload | `/users/me`, `/storage/images/upload` |
| TV1 | Chọn role | `/users/me/role` |
| TV1 | Refresh token, Logout | `/auth/refresh`, `/auth/logout` |
| TV2 | CRUD sản phẩm, Upload ảnh | `/products/*` |
| TV2 | Reviews | `/reviews/*` |
| TV3 | Checkout → Tạo đơn, Lịch sử, Chi tiết | `/orders/*` |
| TV3 | Seller xem đơn, xác nhận/hủy | `GET/PATCH /orders` |
| TV4 | Notifications, badge, mark read | `/notifications/*` |
