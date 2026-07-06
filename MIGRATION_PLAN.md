# AgriLink Mobile Backend — Kế hoạch chuyển đổi sang MongoDB

> **Nguồn:** `agrilink-backend` (NestJS + TypeORM + PostgreSQL)  
> **Đích:** `Agrilink_Mobile-Backend` (NestJS + Mongoose + MongoDB)  
> **Scope đơn giản hóa:** 3 actor — Nông dân (farmer), Người bán nông cụ (supplier), Người mua hàng (customer)  
> **Mục tiêu:** MVP phục vụ mobile sprint 03/07 – 17/07/2026

---

## 1. So sánh kiến trúc

| Hạng mục | Backend cũ (PostgreSQL) | Backend mới (MongoDB) |
|---|---|---|
| ORM | TypeORM, entity class + decorator | Mongoose, Schema class + decorator |
| DB | PostgreSQL (relational, UUID PK) | MongoDB (document, ObjectId `_id`) |
| Modules | 14 modules (admin, ads, cooperatives, geography, market-prices, profiles, traceability, reviews, notifications, wishlist, storage, auth, users, products) | **7 modules cốt lõi** (auth, users, products, orders, notifications, reviews, storage) |
| Loại bỏ | cooperatives, geography, market-prices, traceability, ads, admin, profiles (complex) | — |
| Auth | OTP mock + password hash + JWT | Firebase Phone Auth → JWT sync (giữ nguyên luồng) |
| Guard | JwtAuthGuard + RolesGuard (global) | Giữ nguyên |
| Response | `ResponseInterceptor` → `{ statusCode, data, message }` | Giữ nguyên format |

---

## 2. Ba actor và luồng cơ bản

```
Nông dân (farmer)
  ├── Đăng ký / Đăng nhập (Firebase OTP → JWT)
  ├── Tạo / Sửa / Xóa sản phẩm nông sản
  ├── Xem đơn hàng nhận được
  └── Xác nhận / Hủy đơn

Người bán nông cụ (supplier)
  ├── Đăng ký / Đăng nhập
  ├── Tạo / Sửa / Xóa sản phẩm nông cụ / vật tư
  ├── Xem đơn hàng nhận được
  └── Xác nhận / Hủy đơn

Người mua hàng (customer)
  ├── Đăng ký / Đăng nhập
  ├── Xem / Tìm kiếm sản phẩm
  ├── Thêm giỏ hàng → Checkout → Đặt hàng
  ├── Xem lịch sử đơn / Chi tiết đơn
  └── Để lại review sản phẩm
```

---

## 3. Cấu trúc thư mục đích

```
Agrilink_Mobile-Backend/
├── src/
│   ├── app.module.ts
│   ├── main.ts
│   ├── common/
│   │   ├── decorators/
│   │   │   ├── current-user.decorator.ts      # giữ nguyên
│   │   │   └── roles.decorator.ts             # giữ nguyên
│   │   ├── guards/
│   │   │   ├── jwt-auth.guard.ts              # giữ nguyên
│   │   │   └── roles.guard.ts                 # giữ nguyên
│   │   ├── interceptors/
│   │   │   └── response.interceptor.ts        # giữ nguyên format
│   │   ├── filters/
│   │   │   └── http-exception.filter.ts       # giữ nguyên
│   │   └── dto/
│   │       └── pagination.dto.ts              # giữ nguyên
│   ├── config/
│   │   ├── database.config.ts                 # ĐỔI → mongoose URI
│   │   └── jwt.config.ts                      # giữ nguyên
│   └── modules/
│       ├── auth/                              # Port từ cũ, bỏ password/bcrypt
│       ├── users/                             # Đơn giản hóa
│       ├── products/                          # Schema mới, bỏ enums phức tạp
│       ├── orders/                            # MỚI HOÀN TOÀN
│       ├── reviews/                           # Port, đơn giản hóa
│       ├── notifications/                     # Port, đơn giản hóa
│       └── storage/                           # Port giữ nguyên
├── .env.example
├── package.json
└── nest-cli.json
```

---

## 4. MongoDB Schemas (thay thế TypeORM Entities)

### 4.1 User Schema
```typescript
// Giữ: id, phone, role, fullName, avatarUrl, isActive
// Bỏ: passwordHash, bcrypt, profileId relations
// Thêm: firebaseUid (để link Firebase Auth)

{
  _id: ObjectId,
  firebaseUid: String,      // unique, từ Firebase
  phone: String,            // unique
  role: enum['farmer','supplier','customer'],
  fullName: String,
  avatarUrl: String,
  address: String,
  isActive: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

### 4.2 Product Schema
```typescript
// Bỏ: TypeORM enums (FarmingType, ProductUnit, SellerType, ProductStatus)
//     productCategory entity riêng, provinceId/districtId foreign key
// Giữ: name, description, pricePerUnit, unit, quantity, images, certifications
// Embed: category (string), images (array embedded), certifications (array embedded)

{
  _id: ObjectId,
  sellerId: ObjectId,       // ref: User
  sellerType: enum['farmer','supplier'],
  name: String,
  description: String,
  category: String,         // tên đơn giản, không FK
  pricePerUnit: Number,
  unit: String,             // 'kg','g','box','bottle','bunch',...
  availableQuantity: Number,
  minOrderQuantity: Number,
  status: enum['draft','active','sold_out','hidden'],
  farmingType: String,      // 'organic','traditional','vietgap',...
  province: String,         // tên tỉnh thành (text, không FK)
  harvestDate: Date,
  expiryDate: Date,
  images: [{ url: String, isPrimary: Boolean }],
  certifications: [{ name: String }],
  viewCount: Number,
  createdAt: Date,
  updatedAt: Date
}
```

### 4.3 Order Schema (MỚI — không có trong backend cũ)
```typescript
{
  _id: ObjectId,
  orderCode: String,          // AGL-YYYYMMDD-XXX, tự sinh
  buyerId: ObjectId,          // ref: User (customer)
  sellerId: ObjectId,         // ref: User (farmer/supplier)
  status: enum['pending','confirmed','preparing','shipping','delivered','cancelled'],
  items: [{
    productId: ObjectId,
    productSnapshot: {         // snapshot lúc đặt hàng
      name: String,
      pricePerUnit: Number,
      unit: String,
      imageUrl: String
    },
    quantity: Number,
    unitPrice: Number,
    totalPrice: Number
  }],
  shippingAddressSnapshot: {
    recipientName: String,
    phone: String,
    address: String
  },
  subtotal: Number,
  shippingFee: Number,
  totalAmount: Number,
  paymentMethod: enum['cod','bank_transfer','vnpay'],
  paymentStatus: enum['unpaid','paid','refunded'],
  note: String,
  cancelReason: String,
  createdAt: Date,
  updatedAt: Date
}
```

### 4.4 Review Schema
```typescript
{
  _id: ObjectId,
  productId: ObjectId,       // ref: Product
  buyerId: ObjectId,         // ref: User
  orderId: ObjectId,         // ref: Order (verify mua thật)
  rating: Number,            // 1-5
  comment: String,
  createdAt: Date
}
```

### 4.5 Notification Schema
```typescript
{
  _id: ObjectId,
  userId: ObjectId,
  type: String,              // 'order_created','order_confirmed','order_shipped',...
  title: String,
  body: String,
  data: Object,              // { orderId, productId, ... }
  isRead: Boolean,
  createdAt: Date
}
```

---

## 5. API Endpoints giữ nguyên (mobile không cần sửa)

| Method | Endpoint | Actor | Trạng thái |
|---|---|---|---|
| POST | `/auth/sync` | All | Port giữ nguyên |
| GET | `/users/me` | All | Port giữ nguyên |
| PATCH | `/users/me` | All | Port giữ nguyên |
| PUT | `/users/me/role` | All | Port + **thêm mới** (cũ thiếu) |
| POST | `/auth/refresh` | All | Port giữ nguyên |
| POST | `/auth/logout` | All | Port giữ nguyên |
| POST | `/storage/images/upload` | All | Port giữ nguyên |
| GET | `/products` | All | Port giữ nguyên query params |
| GET | `/products/:id` | All | Port giữ nguyên |
| POST | `/products` | farmer, supplier | Port giữ nguyên |
| PATCH | `/products/:id` | farmer, supplier | Port giữ nguyên |
| DELETE | `/products/:id` | farmer, supplier | Port giữ nguyên |
| POST | `/products/:id/images` | farmer, supplier | Port giữ nguyên |
| **POST** | **`/orders`** | customer | **MỚI** |
| **GET** | **`/orders`** | All | **MỚI** |
| **GET** | **`/orders/:id`** | All | **MỚI** |
| **PATCH** | **`/orders/:id/status`** | farmer, supplier | **MỚI** |
| GET | `/reviews/product/:id` | All | Port giữ nguyên |
| POST | `/reviews` | customer | Port giữ nguyên |
| GET | `/notifications` | All | Port giữ nguyên |
| PATCH | `/notifications/:id/read` | All | Port giữ nguyên |
| PATCH | `/notifications/read-all` | All | Port giữ nguyên |

**Loại bỏ hoàn toàn:** `/geography`, `/market-prices`, `/trace`, `/wishlist`, `/cooperatives`, `/ads`, `/admin`, `/profiles`

---

## 6. Kế hoạch thực hiện (theo phase)

### Phase 1 — Khởi tạo dự án + Auth + Users (Ưu tiên cao nhất)

**Bước 1: Setup project**
```bash
cd Agrilink_Mobile-Backend
npx @nestjs/cli new . --package-manager npm --skip-git
npm install @nestjs/mongoose mongoose
npm install @nestjs/jwt @nestjs/passport passport passport-jwt
npm install @nestjs/config
npm install class-validator class-transformer
npm install @nestjs/axios axios
npm uninstall @nestjs/typeorm typeorm pg  # không cần nữa
```

**Bước 2: Cấu hình MongoDB**
- `database.config.ts`: đổi từ TypeORM `postgres` → Mongoose `MongooseModule.forUri()`
- URI: `mongodb://localhost:27017/agrilink_mobile` (dev) hoặc MongoDB Atlas (prod)
- `.env`: thêm `MONGODB_URI`, giữ `JWT_SECRET`, `JWT_EXPIRES_IN`, `REFRESH_SECRET`

**Bước 3: Copy và adapt Common layer**
- Copy nguyên: `decorators/`, `guards/`, `interceptors/`, `filters/`, `dto/pagination.dto.ts`
- Không thay đổi gì — tất cả vẫn hoạt động với Mongoose

**Bước 4: User module**
- Tạo `user.schema.ts` (thay `user.entity.ts`)
- Port `UsersService` — đổi `Repository<User>` → `Model<UserDocument>`
- Đổi tất cả `.findOneBy({})` → `.findOne({})`, `.update()` → `.findByIdAndUpdate()`

**Bước 5: Auth module**
- Port `AuthService`, bỏ hoàn toàn bcrypt/password
- Giữ: `sendOtp`, `verifyOtp`, `syncFirebase`, `refresh`, `logout`
- Thêm: `PUT /users/me/role` endpoint (backend cũ thiếu, tracker ghi cần thêm)
- OTP: giữ mock hoặc SMS service nếu TV1 đã làm

**Deliverable Phase 1:** Auth flow hoạt động end-to-end với MongoDB

---

### Phase 2 — Products module

**Bước 6: Product schema**
- Tạo `product.schema.ts` — embed `images[]` và `certifications[]` trực tiếp (không tạo collection riêng)
- Bỏ `ProductCategory` entity → dùng `category: String`
- Bỏ `provinceId: UUID FK` → dùng `province: String`

**Bước 7: Products service + controller**
- Port `ProductsService` — đổi TypeORM query builder → Mongoose `.find()` với filter object
- Filter mapping:
  - `?category=X` → `{ category: { $regex: X, $options: 'i' } }`
  - `?province=X` → `{ province: X }`
  - `?farmingType=X` → `{ farmingType: X }`
  - `?sellerId=me` → `{ sellerId: req.user.sub }`
- Giữ nguyên response format `{ items, total }` để mobile không đổi gì

**Bước 8: Storage module**
- Port nguyên từ backend cũ (upload ảnh không phụ thuộc DB)

**Deliverable Phase 2:** CRUD sản phẩm hoạt động, mobile TV2 có thể test

---

### Phase 3 — Orders module (MỚI HOÀN TOÀN)

**Bước 9: Order schema**
- Tạo `order.schema.ts` theo schema mô tả ở mục 4.3
- Tự sinh `orderCode`: `AGL-${YYYYMMDD}-${Math.random().toString(36).slice(2,6).toUpperCase()}`

**Bước 10: Orders service**
```typescript
// POST /orders
async createOrder(buyerId: string, dto: CreateOrderDto): Promise<Order> {
  // 1. Validate products còn hàng
  // 2. Xác định sellerId từ product đầu tiên (MVP: 1 seller / order)
  // 3. Tính subtotal, shippingFee, totalAmount
  // 4. Lưu order với status='pending'
  // 5. Gửi notification cho seller
}

// GET /orders — customer thấy đơn của mình, seller thấy đơn nhận được
async getOrders(userId: string, role: string, status?: string): Promise<Order[]> {
  const filter = role === 'customer'
    ? { buyerId: userId }
    : { sellerId: userId };
  if (status) filter['status'] = status;
  return this.orderModel.find(filter).sort({ createdAt: -1 });
}

// PATCH /orders/:id/status
async updateStatus(orderId: string, sellerId: string, status: string, reason?: string)
```

**Bước 11: Wiring**
- Đăng ký `OrdersModule` vào `app.module.ts`
- `OrdersController` có `@Roles('farmer','supplier')` guard trên PATCH endpoint

**Deliverable Phase 3:** Flow mua hàng end-to-end hoạt động với MongoDB

---

### Phase 4 — Reviews + Notifications

**Bước 12: Reviews module**
- Port từ cũ, đổi entity → schema
- Thêm validate: chỉ review nếu `orderId` có `status='delivered'` và `buyerId` khớp

**Bước 13: Notifications module**
- Port `NotificationsService` từ cũ
- Giữ REST (không socket) — match với risk register tracker
- `createNotification()` được gọi từ `OrdersService` khi status thay đổi

**Deliverable Phase 4:** Full MVP hoàn chỉnh

---

## 7. Thay đổi dependencies (package.json)

### Xóa
```
@nestjs/typeorm
typeorm
pg
bcryptjs
@types/bcryptjs
```

### Thêm
```
@nestjs/mongoose
mongoose
```

### Giữ nguyên
```
@nestjs/jwt
@nestjs/passport
passport
passport-jwt
@nestjs/config
@nestjs/axios
axios
class-validator
class-transformer
```

---

## 8. Environment variables (.env)

```env
# Cũ → Mới
# DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASS  →  XÓA
MONGODB_URI=mongodb://localhost:27017/agrilink_mobile   # THÊM

# Giữ nguyên
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=15m
REFRESH_SECRET=your_refresh_secret
REFRESH_EXPIRES_IN=7d
PORT=5000

# Nếu dùng Firebase Admin SDK
FIREBASE_PROJECT_ID=...
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY=...

# Nếu dùng SMS
SMS_API_KEY=...
```

---

## 9. Mapping code pattern chuyển đổi

| TypeORM pattern | Mongoose pattern |
|---|---|
| `@InjectRepository(Entity)` | `@InjectModel(Entity.name)` |
| `Repository<Entity>` | `Model<EntityDocument>` |
| `repo.findOneBy({ id })` | `model.findById(id)` |
| `repo.findOneBy({ phone })` | `model.findOne({ phone })` |
| `repo.find()` | `model.find()` |
| `repo.save(entity)` | `new model(data).save()` |
| `repo.update(id, data)` | `model.findByIdAndUpdate(id, data, { new: true })` |
| `repo.delete(id)` | `model.findByIdAndDelete(id)` |
| `@Entity('table')` | `@Schema({ timestamps: true })` |
| `@PrimaryGeneratedColumn('uuid')` | `_id: ObjectId` (tự động) |
| `@Column()` | `@Prop()` |
| `@CreateDateColumn()` | timestamps: true trong Schema options |
| `@ManyToOne()` / `@OneToMany()` | `@Prop({ type: Types.ObjectId, ref: 'Model' })` |

---

## 10. Checklist hoàn thành

- [ ] **Phase 1** — Project init, Common layer, Auth, Users
  - [ ] `npm install` xong với Mongoose
  - [ ] `database.config.ts` kết nối MongoDB thành công
  - [ ] `POST /auth/sync` trả JWT
  - [ ] `GET /users/me` trả user info
  - [ ] `PUT /users/me/role` hoạt động (endpoint mới)
- [ ] **Phase 2** — Products
  - [ ] `GET /products` trả `{ items, total }` đúng format mobile
  - [ ] `POST /products` tạo sản phẩm (farmer/supplier)
  - [ ] `POST /storage/images/upload` upload ảnh
- [ ] **Phase 3** — Orders
  - [ ] `POST /orders` tạo đơn hàng từ cart mobile
  - [ ] `GET /orders` customer thấy đơn mình, seller thấy đơn nhận
  - [ ] `PATCH /orders/:id/status` seller xác nhận/hủy
- [ ] **Phase 4** — Reviews + Notifications
  - [ ] `POST /reviews` sau khi delivered
  - [ ] `GET /notifications` và `PATCH /notifications/read-all`
- [ ] **Smoke test với mobile** — chạy `flutter run -d edge`, tất cả API không còn fallback mock

---

## 11. Ghi chú kỹ thuật quan trọng

1. **ObjectId vs UUID:** Mobile đang dùng `String` cho `id` — MongoDB `ObjectId.toString()` là chuỗi 24 ký tự hex, tương thích với Dart `String`. Không cần đổi code mobile.

2. **Response format phải giữ:** `{ statusCode: 200, data: ..., message: "Success" }` — `ResponseInterceptor` port nguyên từ cũ.

3. **sellerId trong Orders:** MVP giả định mỗi đơn hàng chỉ có 1 seller. Nếu cart có nhiều seller, tách thành nhiều `Order` document.

4. **Port:** Giữ `5000` để mobile không đổi `api_constants.dart`.

5. **`PUT /users/me/role`:** Backend cũ chưa có endpoint này (ghi trong tracker + risk register). Phải implement trong Phase 1 để `RolePickerScreen` hoạt động thật.

6. **Mongoose populate vs embed:** Dùng embed cho `images[]`, `certifications[]`, `items[]` trong Order — tránh N+1 query. Dùng `populate` cho `sellerId`, `buyerId` chỉ khi cần full user object.
