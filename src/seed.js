/**
 * Seed script — chạy một lần để đẩy dữ liệu mẫu vào MongoDB
 * Usage: npm run seed
 */
require('dotenv').config();
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const User = require('./modules/users/user.model');
const Product = require('./modules/products/product.model');
const Order = require('./modules/orders/order.model');
const Review = require('./modules/reviews/review.model');
const Wishlist = require('./modules/wishlists/wishlist.model');

const MONGO_URI = process.env.MONGODB_URI;

// ─── Demo users ───────────────────────────────────────────────────────────────
const USERS = [
  {
    email: 'farmer1@agrilink.vn',
    password: 'demo123',
    role: 'farmer',
    fullName: 'Nguyễn Văn An',
    address: 'Đà Lạt, Lâm Đồng',
    isVerified: true,
  },
  {
    email: 'farmer2@agrilink.vn',
    password: 'demo123',
    role: 'farmer',
    fullName: 'Trần Thị Bình',
    address: 'Tiền Giang',
    isVerified: true,
  },
  {
    email: 'farmer3@agrilink.vn',
    password: 'demo123',
    role: 'farmer',
    fullName: 'Lê Minh Tuấn',
    address: 'Đắk Lắk',
    isVerified: true,
  },
  {
    email: 'farmer4@agrilink.vn',
    password: 'demo123',
    role: 'farmer',
    fullName: 'Võ Thị Hoa',
    address: 'An Giang',
    isVerified: true,
  },
  {
    email: 'supplier1@agrilink.vn',
    password: 'demo123',
    role: 'supplier',
    fullName: 'Công ty TNHH Vật tư Nông nghiệp Xanh',
    address: 'TP. Hồ Chí Minh',
    isVerified: true,
  },
  {
    email: 'supplier2@agrilink.vn',
    password: 'demo123',
    role: 'supplier',
    fullName: 'Công ty CP Thiết bị Nông nghiệp Việt',
    address: 'Hà Nội',
    isVerified: true,
  },
  {
    email: 'customer1@agrilink.vn',
    password: 'demo123',
    role: 'customer',
    fullName: 'Lê Văn Cường',
    address: 'Hà Nội',
    isVerified: true,
  },
  {
    email: 'customer2@agrilink.vn',
    password: 'demo123',
    role: 'customer',
    fullName: 'Phạm Thị Dung',
    address: 'TP. Hồ Chí Minh',
    isVerified: true,
  },
  {
    email: 'customer3@agrilink.vn',
    password: 'demo123',
    role: 'customer',
    fullName: 'Hoàng Văn Minh',
    address: 'Đà Nẵng',
    isVerified: true,
  },
  {
    email: 'customer4@agrilink.vn',
    password: 'demo123',
    role: 'customer',
    fullName: 'Nguyễn Thị Lan',
    address: 'Hải Phòng',
    isVerified: true,
  },
  {
    email: 'customer5@agrilink.vn',
    password: 'demo123',
    role: 'customer',
    fullName: 'Trần Văn Đức',
    address: 'Cần Thơ',
    isVerified: true,
  },
  {
    email: 'customer6@agrilink.vn',
    password: 'demo123',
    role: 'customer',
    fullName: 'Đỗ Thị Hằng',
    address: 'Huế',
    isVerified: true,
  },
  {
    email: 'customer7@agrilink.vn',
    password: 'demo123',
    role: 'customer',
    fullName: 'Bùi Minh Khoa',
    address: 'Nha Trang, Khánh Hòa',
    isVerified: true,
  },
  {
    email: 'customer8@agrilink.vn',
    password: 'demo123',
    role: 'customer',
    fullName: 'Ngô Thị Thu',
    address: 'Vũng Tàu',
    isVerified: true,
  },
  {
    email: 'customer9@agrilink.vn',
    password: 'demo123',
    role: 'customer',
    fullName: 'Phan Văn Long',
    address: 'Biên Hòa, Đồng Nai',
    isVerified: true,
  },
  {
    email: 'customer10@agrilink.vn',
    password: 'demo123',
    role: 'customer',
    fullName: 'Vũ Thị Nga',
    address: 'Nam Định',
    isVerified: true,
  },
  {
    email: 'customer11@agrilink.vn',
    password: 'demo123',
    role: 'customer',
    fullName: 'Đặng Văn Phúc',
    address: 'Buôn Ma Thuột, Đắk Lắk',
    isVerified: true,
  },
  {
    email: 'customer12@agrilink.vn',
    password: 'demo123',
    role: 'customer',
    fullName: 'Lý Thị Mai',
    address: 'Quy Nhơn, Bình Định',
    isVerified: true,
  },
];

// ─── Products ─────────────────────────────────────────────────────────────────
const PRODUCTS_TEMPLATE = (farmerIds, supplierIds) => [

  // ── FARMER 1 — Nguyễn Văn An, Lâm Đồng ─────────────────────────────────────
  {
    sellerId: farmerIds[0], sellerType: 'farmer',
    name: 'Dâu tây thủy canh Đà Lạt',
    description: 'Dâu tây trồng nhà màng công nghệ cao, VietGAP. Quả to đều, chín đỏ mọng, vị ngọt thanh, không thuốc BVTV hóa học.',
    category: 'Trái cây', pricePerUnit: 180000, unit: 'kg',
    availableQuantity: 50, minOrderQuantity: 1,
    farmingType: 'hydroponic', province: 'Lâm Đồng', status: 'active',
    images: [{ url: 'https://images.unsplash.com/photo-1464965911861-746a04b4bca6?w=800', isPrimary: true }],
    certifications: [{ name: 'VietGAP' }],
  },
  {
    sellerId: farmerIds[0], sellerType: 'farmer',
    name: 'Cà chua bi organic Đà Lạt',
    description: 'Cà chua bi trồng hữu cơ cao nguyên Đà Lạt. Giàu vitamin C, lycopene. Không thuốc trừ sâu hóa học, thu hoạch sáng giao chiều.',
    category: 'Rau củ quả', pricePerUnit: 35000, unit: 'kg',
    availableQuantity: 200, minOrderQuantity: 2,
    farmingType: 'organic', province: 'Lâm Đồng', status: 'active',
    images: [{ url: 'https://images.unsplash.com/photo-1546094096-0df4bcaaa337?w=800', isPrimary: true }],
    certifications: [{ name: 'Organic' }, { name: 'VietGAP' }],
  },
  {
    sellerId: farmerIds[0], sellerType: 'farmer',
    name: 'Bắp cải thảo Đà Lạt',
    description: 'Bắp cải thảo VietGAP, lá xanh mướt, cuống mập, không sâu bệnh. Thu hoạch trong ngày, đóng gói sạch.',
    category: 'Rau củ quả', pricePerUnit: 20000, unit: 'kg',
    availableQuantity: 500, minOrderQuantity: 5,
    farmingType: 'vietgap', province: 'Lâm Đồng', status: 'active',
    images: [{ url: 'https://images.unsplash.com/photo-1594282486552-05b4d80fbb9f?w=800', isPrimary: true }],
    certifications: [{ name: 'VietGAP' }],
  },
  {
    sellerId: farmerIds[0], sellerType: 'farmer',
    name: 'Cà phê Arabica Đà Lạt',
    description: 'Arabica hái chín đỏ trên cao nguyên Lâm Đồng 1500m. Chế biến ướt, rang light-medium. Hương hoa quả thanh, vị chua dịu đặc trưng.',
    category: 'Cà phê & Chè', pricePerUnit: 220000, unit: 'kg',
    availableQuantity: 150, minOrderQuantity: 1,
    farmingType: 'organic', province: 'Lâm Đồng', status: 'active',
    images: [{ url: 'https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=800', isPrimary: true }],
    certifications: [{ name: 'Organic' }],
  },
  {
    sellerId: farmerIds[0], sellerType: 'farmer',
    name: 'Rau xà lách thủy canh Đà Lạt',
    description: 'Xà lách trồng thủy canh NFT trong nhà màng kiểm soát nhiệt độ. Lá giòn xanh mướt, không đất, không vi khuẩn. Rửa là dùng ngay.',
    category: 'Rau củ quả', pricePerUnit: 28000, unit: 'kg',
    availableQuantity: 300, minOrderQuantity: 1,
    farmingType: 'hydroponic', province: 'Lâm Đồng', status: 'active',
    images: [{ url: 'https://images.unsplash.com/photo-1622206151226-18ca2c9ab4a1?w=800', isPrimary: true }],
    certifications: [{ name: 'VietGAP' }],
  },
  {
    sellerId: farmerIds[0], sellerType: 'farmer',
    name: 'Hoa atiso Đà Lạt',
    description: 'Hoa atiso tươi Đà Lạt, búp to tròn chắc, màu xanh tím đặc trưng. Dùng nấu canh, làm trà, sấy khô. Thu hoạch sáng sớm, đóng thùng lạnh.',
    category: 'Rau củ quả', pricePerUnit: 45000, unit: 'kg',
    availableQuantity: 120, minOrderQuantity: 2,
    farmingType: 'conventional', province: 'Lâm Đồng', status: 'active',
    images: [{ url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800', isPrimary: true }],
    certifications: [],
  },

  // ── FARMER 2 — Trần Thị Bình, Tiền Giang ────────────────────────────────────
  {
    sellerId: farmerIds[1], sellerType: 'farmer',
    name: 'Sầu riêng Ri6 Tiền Giang',
    description: 'Sầu riêng Ri6 chín cây vườn Tiền Giang. Múi dày vàng ươm, vị ngậy béo thơm. Giao cả cây hoặc tách múi theo yêu cầu.',
    category: 'Trái cây', pricePerUnit: 120000, unit: 'kg',
    availableQuantity: 300, minOrderQuantity: 5,
    farmingType: 'conventional', province: 'Tiền Giang', status: 'active',
    images: [{ url: 'https://images.unsplash.com/photo-1568702846914-96b305d2aaeb?w=800', isPrimary: true }],
    certifications: [],
  },
  {
    sellerId: farmerIds[1], sellerType: 'farmer',
    name: 'Xoài cát Hòa Lộc',
    description: 'Xoài cát Hòa Lộc chín vàng đặc sản Tiền Giang, thịt chắc ngọt thanh ít xơ. Chứng nhận chỉ dẫn địa lý, xuất khẩu Nhật Bản.',
    category: 'Trái cây', pricePerUnit: 65000, unit: 'kg',
    availableQuantity: 400, minOrderQuantity: 3,
    farmingType: 'vietgap', province: 'Tiền Giang', status: 'active',
    images: [{ url: 'https://images.unsplash.com/photo-1601493700631-2b16ec4b4716?w=800', isPrimary: true }],
    certifications: [{ name: 'VietGAP' }],
  },
  {
    sellerId: farmerIds[1], sellerType: 'farmer',
    name: 'Gạo ST25 Sóc Trăng',
    description: 'Gạo ST25 — gạo ngon nhất thế giới 2019. Hạt dài trong, cơm dẻo thơm hương lá dứa. Đóng túi hút chân không 5kg.',
    category: 'Lúa gạo & Ngũ cốc', pricePerUnit: 38000, unit: 'kg',
    availableQuantity: 1000, minOrderQuantity: 5,
    farmingType: 'conventional', province: 'Sóc Trăng', status: 'active',
    images: [{ url: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=800', isPrimary: true }],
    certifications: [],
  },
  {
    sellerId: farmerIds[1], sellerType: 'farmer',
    name: 'Dừa tươi Bến Tre',
    description: 'Dừa xiêm xanh Bến Tre, nước ngọt mát tự nhiên, cơm dừa mỏng giòn. Thu hái đúng ngày 7-8 tháng. Giao cả buồng hoặc lẻ.',
    category: 'Trái cây', pricePerUnit: 15000, unit: 'trái',
    availableQuantity: 2000, minOrderQuantity: 10,
    farmingType: 'conventional', province: 'Bến Tre', status: 'active',
    images: [{ url: 'https://images.unsplash.com/photo-1499638673689-79a0b5115d87?w=800', isPrimary: true }],
    certifications: [],
  },
  {
    sellerId: farmerIds[1], sellerType: 'farmer',
    name: 'Nhãn lồng Hưng Yên',
    description: 'Nhãn lồng Hưng Yên chính vụ, cùi dày, hạt nhỏ, vị ngọt đậm thơm. Thu hoạch tháng 7-8. Đóng hộp 5kg.',
    category: 'Trái cây', pricePerUnit: 75000, unit: 'kg',
    availableQuantity: 500, minOrderQuantity: 2,
    farmingType: 'conventional', province: 'Hưng Yên', status: 'active',
    images: [{ url: 'https://images.unsplash.com/photo-1596591868231-05e4a2099174?w=800', isPrimary: true }],
    certifications: [],
  },

  // ── FARMER 3 — Lê Minh Tuấn, Đắk Lắk ───────────────────────────────────────
  {
    sellerId: farmerIds[2], sellerType: 'farmer',
    name: 'Cà phê Robusta Đắk Lắk',
    description: 'Robusta Đắk Lắk rang đậm, hương chocolate đất, vị đắng mạnh crema dày. Phù hợp pha phin truyền thống hoặc espresso. Túi 500g có van thoát khí.',
    category: 'Cà phê & Chè', pricePerUnit: 145000, unit: 'kg',
    availableQuantity: 500, minOrderQuantity: 1,
    farmingType: 'conventional', province: 'Đắk Lắk', status: 'active',
    images: [{ url: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800', isPrimary: true }],
    certifications: [],
  },
  {
    sellerId: farmerIds[2], sellerType: 'farmer',
    name: 'Tiêu đen Bình Phước',
    description: 'Tiêu đen hạt to đều vườn Bình Phước. Phơi nắng tự nhiên 7 ngày, cay nồng đặc trưng, dầu tinh dầu cao. Túi 500g.',
    category: 'Gia vị & Thảo mộc', pricePerUnit: 95000, unit: 'kg',
    availableQuantity: 200, minOrderQuantity: 0.5,
    farmingType: 'conventional', province: 'Bình Phước', status: 'active',
    images: [{ url: 'https://images.unsplash.com/photo-1543352634-99a5d50ae78e?w=800', isPrimary: true }],
    certifications: [],
  },
  {
    sellerId: farmerIds[2], sellerType: 'farmer',
    name: 'Bơ booth 034 Đắk Lắk',
    description: 'Bơ booth 034 chín đều, thịt vàng kem mịn không xơ, béo ngậy. Trọng lượng 300-500g/quả. Thu hoạch đúng ngày để đảm bảo vị.',
    category: 'Trái cây', pricePerUnit: 55000, unit: 'kg',
    availableQuantity: 350, minOrderQuantity: 2,
    farmingType: 'conventional', province: 'Đắk Lắk', status: 'active',
    images: [{ url: 'https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?w=800', isPrimary: true }],
    certifications: [],
  },
  {
    sellerId: farmerIds[2], sellerType: 'farmer',
    name: 'Mắc ca Đắk Lắk',
    description: 'Hạt mắc ca rang muối Đắk Lắk, vỏ tự nứt đúng độ chín. Nhân béo giòn, hàm lượng chất béo tốt cao. Túi zip 500g bảo quản 6 tháng.',
    category: 'Hạt & Đậu', pricePerUnit: 380000, unit: 'kg',
    availableQuantity: 100, minOrderQuantity: 0.5,
    farmingType: 'conventional', province: 'Đắk Lắk', status: 'active',
    images: [{ url: 'https://images.unsplash.com/photo-1574856344991-aaa31b6f4ce3?w=800', isPrimary: true }],
    certifications: [],
  },
  {
    sellerId: farmerIds[2], sellerType: 'farmer',
    name: 'Nghệ vàng Đắk Lắk',
    description: 'Nghệ vàng củ tươi trồng tự nhiên Đắk Lắk. Hàm lượng curcumin cao 4-5%. Dùng nấu ăn, làm bột nghệ, chữa bệnh. Củ to tròn đều.',
    category: 'Gia vị & Thảo mộc', pricePerUnit: 30000, unit: 'kg',
    availableQuantity: 400, minOrderQuantity: 1,
    farmingType: 'organic', province: 'Đắk Lắk', status: 'active',
    images: [{ url: 'https://images.unsplash.com/photo-1615485500704-8e990f9900f7?w=800', isPrimary: true }],
    certifications: [{ name: 'Organic' }],
  },

  // ── FARMER 4 — Võ Thị Hoa, An Giang ─────────────────────────────────────────
  {
    sellerId: farmerIds[3], sellerType: 'farmer',
    name: 'Cá tra fillet An Giang',
    description: 'Cá tra nuôi sạch theo tiêu chuẩn ASC. Fillet tươi đông IQF, không chứa chất bảo quản. Xuất khẩu EU. Giao hàng lạnh 0-4°C.',
    category: 'Thủy hải sản', pricePerUnit: 85000, unit: 'kg',
    availableQuantity: 800, minOrderQuantity: 5,
    farmingType: 'conventional', province: 'An Giang', status: 'active',
    images: [{ url: 'https://images.unsplash.com/photo-1559181567-c3190958d3ab?w=800', isPrimary: true }],
    certifications: [{ name: 'ASC' }],
  },
  {
    sellerId: farmerIds[3], sellerType: 'farmer',
    name: 'Tôm thẻ chân trắng Cà Mau',
    description: 'Tôm thẻ chân trắng nuôi sinh thái rừng ngập mặn Cà Mau. Không kháng sinh, không hóa chất. Size 30-40 con/kg. Đông lạnh block 2kg.',
    category: 'Thủy hải sản', pricePerUnit: 220000, unit: 'kg',
    availableQuantity: 300, minOrderQuantity: 2,
    farmingType: 'organic', province: 'Cà Mau', status: 'active',
    images: [{ url: 'https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?w=800', isPrimary: true }],
    certifications: [{ name: 'Organic' }, { name: 'ASC' }],
  },
  {
    sellerId: farmerIds[3], sellerType: 'farmer',
    name: 'Gạo Jasmine An Giang',
    description: 'Gạo Jasmine thơm An Giang, hạt dài trắng trong, cơm mềm dẻo thơm hương lài tự nhiên. Xay xát trong ngày. Bao 10kg.',
    category: 'Lúa gạo & Ngũ cốc', pricePerUnit: 32000, unit: 'kg',
    availableQuantity: 2000, minOrderQuantity: 10,
    farmingType: 'vietgap', province: 'An Giang', status: 'active',
    images: [{ url: 'https://images.unsplash.com/photo-1536304993881-ff6e9eefa2a6?w=800', isPrimary: true }],
    certifications: [{ name: 'VietGAP' }],
  },
  {
    sellerId: farmerIds[3], sellerType: 'farmer',
    name: 'Mật ong rừng Tây Bắc',
    description: 'Mật ong rừng nguyên chất Tây Bắc, ong làm tổ trên vách đá. Màu hổ phách đậm, sánh đặc, không pha đường. Kiểm định 80° Brix. Chai 500ml.',
    category: 'Thực phẩm chế biến', pricePerUnit: 280000, unit: 'lọ',
    availableQuantity: 150, minOrderQuantity: 1,
    farmingType: 'organic', province: 'Sơn La', status: 'active',
    images: [{ url: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=800', isPrimary: true }],
    certifications: [{ name: 'Organic' }],
  },

  // ── SUPPLIER 1 — Vật tư Nông nghiệp Xanh, HCM ───────────────────────────────
  {
    sellerId: supplierIds[0], sellerType: 'supplier',
    name: 'Phân bón NPK 16-16-8 Đầu Trâu',
    description: 'NPK 16-16-8 chuyên rau màu và cây ăn quả. Tan hoàn toàn trong nước, hấp thu nhanh. Bao 25kg bảo quản 18 tháng.',
    category: 'Phân bón & Thuốc BVTV', pricePerUnit: 18000, unit: 'kg',
    availableQuantity: 5000, minOrderQuantity: 25,
    farmingType: 'conventional', province: 'TP. Hồ Chí Minh', status: 'active',
    images: [{ url: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=800', isPrimary: true }],
    certifications: [],
  },
  {
    sellerId: supplierIds[0], sellerType: 'supplier',
    name: 'Phân hữu cơ vi sinh Sông Gianh',
    description: 'Phân hữu cơ vi sinh từ bã mía + phân bò + Trichoderma. Cải tạo đất, tăng tơi xốp, giảm phèn. Bao 40kg, bảo quản 12 tháng.',
    category: 'Phân bón & Thuốc BVTV', pricePerUnit: 8000, unit: 'kg',
    availableQuantity: 10000, minOrderQuantity: 40,
    farmingType: 'organic', province: 'TP. Hồ Chí Minh', status: 'active',
    images: [{ url: 'https://images.unsplash.com/photo-1500651230702-0e2d8a49d4ad?w=800', isPrimary: true }],
    certifications: [{ name: 'Organic' }],
  },
  {
    sellerId: supplierIds[0], sellerType: 'supplier',
    name: 'Hạt giống Cà chua F1 Thần Nông',
    description: 'Giống cà chua lai F1 chịu nhiệt, kháng TMV. Năng suất 60-80 tấn/ha. Phù hợp nhà kính và ngoài trời. Túi 1000 hạt.',
    category: 'Hạt giống & Cây giống', pricePerUnit: 350000, unit: 'túi',
    availableQuantity: 500, minOrderQuantity: 1,
    farmingType: 'conventional', province: 'TP. Hồ Chí Minh', status: 'active',
    images: [{ url: 'https://images.unsplash.com/photo-1592921870789-04563d55041c?w=800', isPrimary: true }],
    certifications: [],
  },
  {
    sellerId: supplierIds[0], sellerType: 'supplier',
    name: 'Hạt giống dưa lưới F1 Kim Hoàng Hậu',
    description: 'Dưa lưới F1 vỏ vàng lưới dày, ruột cam, độ Brix 14-16. Thời gian từ trồng đến thu hoạch 65-70 ngày. Phù hợp trồng trong nhà màng.',
    category: 'Hạt giống & Cây giống', pricePerUnit: 420000, unit: 'túi',
    availableQuantity: 300, minOrderQuantity: 1,
    farmingType: 'conventional', province: 'TP. Hồ Chí Minh', status: 'active',
    images: [{ url: 'https://images.unsplash.com/photo-1571575173700-afb9492e6a50?w=800', isPrimary: true }],
    certifications: [],
  },
  {
    sellerId: supplierIds[0], sellerType: 'supplier',
    name: 'Màng phủ nông nghiệp bạc đen 1.2m',
    description: 'Màng phủ PE 2 màu bạc-đen chống cỏ dại, giữ ẩm, phản xạ ánh sáng. Rộng 1.2m x 400m/cuộn. Dày 30 micron, bền 2-3 mùa vụ.',
    category: 'Nông cụ & Máy móc', pricePerUnit: 380000, unit: 'cuộn',
    availableQuantity: 200, minOrderQuantity: 1,
    farmingType: 'conventional', province: 'TP. Hồ Chí Minh', status: 'active',
    images: [{ url: 'https://images.unsplash.com/photo-1530836369250-ef72a3f5cda8?w=800', isPrimary: true }],
    certifications: [],
  },
  {
    sellerId: supplierIds[0], sellerType: 'supplier',
    name: 'Lưới chắn côn trùng nhà màng 50 mesh',
    description: 'Lưới HDPE 50 mesh chắn côn trùng nhỏ, thông gió tốt. Khổ 4m, dài 50m/cuộn. Chịu UV 3-5 năm. Dùng cho nhà màng, nhà lưới các loại.',
    category: 'Nông cụ & Máy móc', pricePerUnit: 650000, unit: 'cuộn',
    availableQuantity: 150, minOrderQuantity: 1,
    farmingType: 'conventional', province: 'TP. Hồ Chí Minh', status: 'active',
    images: [{ url: 'https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=800', isPrimary: true }],
    certifications: [],
  },

  // ── SUPPLIER 2 — Thiết bị Nông nghiệp Việt, Hà Nội ──────────────────────────
  {
    sellerId: supplierIds[1], sellerType: 'supplier',
    name: 'Bình phun thuốc điện 16L Kawasaki',
    description: 'Bình phun điện 16L, motor DC không chổi than bền bỉ. Pin lithium 12V 8Ah, phun liên tục 4-5 giờ. Đầu phun điều chỉnh 3 chế độ.',
    category: 'Nông cụ & Máy móc', pricePerUnit: 1250000, unit: 'cái',
    availableQuantity: 80, minOrderQuantity: 1,
    farmingType: 'conventional', province: 'Hà Nội', status: 'active',
    images: [{ url: 'https://images.unsplash.com/photo-1565190939-dc7547065ab2?w=800', isPrimary: true }],
    certifications: [],
  },
  {
    sellerId: supplierIds[1], sellerType: 'supplier',
    name: 'Máy đo độ ẩm đất cầm tay 3-in-1',
    description: 'Đo độ ẩm + pH + ánh sáng đất cùng lúc. Không cần pin, cắm xuống đất đọc kết quả ngay. Phạm vi đo: ẩm 1-10, pH 3.5-8, ánh sáng 0-2000 lux.',
    category: 'Nông cụ & Máy móc', pricePerUnit: 185000, unit: 'cái',
    availableQuantity: 200, minOrderQuantity: 1,
    farmingType: 'conventional', province: 'Hà Nội', status: 'active',
    images: [{ url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800', isPrimary: true }],
    certifications: [],
  },
  {
    sellerId: supplierIds[1], sellerType: 'supplier',
    name: 'Hệ thống tưới nhỏ giọt Israel 1000m²',
    description: 'Bộ tưới nhỏ giọt Netafim cho 1000m². Gồm đường ống LDPE 16mm 200m, đầu nhỏ giọt 2L/h x 500 cái, van điều áp, bộ lọc 120 mesh.',
    category: 'Nông cụ & Máy móc', pricePerUnit: 4500000, unit: 'bộ',
    availableQuantity: 30, minOrderQuantity: 1,
    farmingType: 'conventional', province: 'Hà Nội', status: 'active',
    images: [{ url: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=800', isPrimary: true }],
    certifications: [],
  },
  {
    sellerId: supplierIds[1], sellerType: 'supplier',
    name: 'Nhà kính polycarbonate 6mm 100m²',
    description: 'Khung thép mạ kẽm + mái polycarbonate 6mm 2 lớp cách nhiệt. Kích thước 10m x 10m, cao đỉnh 3.5m. Lắp đặt tại Hà Nội và các tỉnh phía Bắc.',
    category: 'Nông cụ & Máy móc', pricePerUnit: 85000000, unit: 'bộ',
    availableQuantity: 10, minOrderQuantity: 1,
    farmingType: 'conventional', province: 'Hà Nội', status: 'active',
    images: [{ url: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=800', isPrimary: true }],
    certifications: [],
  },
  {
    sellerId: supplierIds[1], sellerType: 'supplier',
    name: 'Thuốc trừ sâu sinh học BT Xentari',
    description: 'Thuốc trừ sâu vi sinh Bacillus thuringiensis, diệt sâu tơ, sâu khoang, bướm trắng. An toàn người và thiên địch. Phân hủy sinh học 3-5 ngày. Gói 100g.',
    category: 'Phân bón & Thuốc BVTV', pricePerUnit: 125000, unit: 'gói',
    availableQuantity: 1000, minOrderQuantity: 5,
    farmingType: 'organic', province: 'Hà Nội', status: 'active',
    images: [{ url: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=800', isPrimary: true }],
    certifications: [{ name: 'Organic' }],
  },
];

async function seed() {
  console.log('🌱 Connecting to MongoDB...');
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected');

  const seedEmails = USERS.map((u) => u.email);
  await User.deleteMany({ email: { $in: seedEmails } });
  console.log('🗑️  Cleared existing demo users');

  const createdUsers = [];
  for (const u of USERS) {
    const passwordHash = await bcrypt.hash(u.password, 10);
    const user = await User.create({ ...u, passwordHash });
    createdUsers.push(user);
    console.log(`👤 Created: ${u.email} (${u.role})`);
  }

  const farmerIds = createdUsers.filter((u) => u.role === 'farmer').map((u) => u._id);
  const supplierIds = createdUsers.filter((u) => u.role === 'supplier').map((u) => u._id);

  await Product.deleteMany({ sellerId: { $in: [...farmerIds, ...supplierIds] } });
  console.log('🗑️  Cleared existing seed products');

  const products = PRODUCTS_TEMPLATE(farmerIds, supplierIds);
  const createdProducts = [];
  for (const p of products) {
    const prod = await Product.create(p);
    createdProducts.push(prod);
    console.log(`📦 Created product: ${p.name}`);
  }

  // ── Seed orders (thuật toán sinh động, đảm bảo mỗi seller/customer ≥5 đơn) ────
  const customerUsers = createdUsers.filter((u) => u.role === 'customer');
  const sellerUsers = createdUsers.filter((u) => u.role === 'farmer' || u.role === 'supplier');

  await Order.deleteMany({ buyerId: { $in: customerUsers.map((u) => u._id) } });
  console.log('🗑️  Cleared existing seed orders');

  const MIN_ORDERS_PER_ACTOR = 5;
  const STATUS_WEIGHTS = [
    ['pending', 0.15],
    ['confirmed', 0.15],
    ['preparing', 0.15],
    ['shipping', 0.15],
    ['delivered', 0.35],
    ['cancelled', 0.05],
  ];

  function pickStatus() {
    const r = Math.random();
    let acc = 0;
    for (const [status, weight] of STATUS_WEIGHTS) {
      acc += weight;
      if (r <= acc) return status;
    }
    return 'delivered';
  }

  // Sinh statusHistory hợp lý theo status, mốc thời gian lùi dần từ baseHoursAgo tới hiện tại.
  function buildStatusHistory(status, baseHoursAgo) {
    const STEPS = ['pending', 'confirmed', 'preparing', 'shipping', 'delivered'];
    if (status === 'cancelled') {
      const cancelStage = Math.random() < 0.7 ? 0 : 1; // đa số hủy ngay lúc pending, số ít sau khi đã confirmed
      const history = [{ status: 'pending', changedAt: new Date(Date.now() - baseHoursAgo * 3600 * 1000) }];
      if (cancelStage === 1) {
        history.push({ status: 'confirmed', changedAt: new Date(Date.now() - (baseHoursAgo - 1) * 3600 * 1000) });
      }
      history.push({ status: 'cancelled', changedAt: new Date(Date.now() - Math.max(0.5, baseHoursAgo - 2) * 3600 * 1000) });
      return history;
    }

    const idx = STEPS.indexOf(status);
    const history = [];
    const step = baseHoursAgo / (idx + 2);
    for (let i = 0; i <= idx; i++) {
      history.push({
        status: STEPS[i],
        changedAt: new Date(Date.now() - Math.max(0.25, baseHoursAgo - step * i) * 3600 * 1000),
      });
    }
    return history;
  }

  // Round-robin có offset: mỗi seller bắt đầu từ 1 điểm khác nhau trên vòng tròn customer
  // để trải đều — tránh customer nào bị bỏ sót hoặc chỉ gắn với 1-2 seller.
  function buildOrderPairs(sellers, customers) {
    const pairs = [];
    const ORDERS_PER_SELLER = 6; // > MIN_ORDERS_PER_ACTOR để có dư, topUp sẽ cân bằng phần còn thiếu
    sellers.forEach((seller, sIdx) => {
      const offset = (sIdx * 2) % customers.length;
      for (let i = 0; i < ORDERS_PER_SELLER; i++) {
        const customer = customers[(offset + i) % customers.length];
        pairs.push({ seller, customer });
      }
    });
    return pairs;
  }

  function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function buildOrder(seller, customer, productsBySeller) {
    const sellerProducts = productsBySeller.get(seller._id.toString()) || [];
    if (sellerProducts.length === 0) return null;

    const itemCount = randInt(1, Math.min(3, sellerProducts.length));
    const shuffled = [...sellerProducts].sort(() => Math.random() - 0.5);
    const chosenProducts = shuffled.slice(0, itemCount);

    const items = chosenProducts.map((p) => {
      const minQty = p.minOrderQuantity || 1;
      const quantity = randInt(Math.ceil(minQty), Math.ceil(minQty) + randInt(1, 5));
      const totalPrice = p.pricePerUnit * quantity;
      return {
        productId: p._id,
        productSnapshot: {
          name: p.name,
          pricePerUnit: p.pricePerUnit,
          unit: p.unit,
          imageUrl: p.images?.[0]?.url || '',
        },
        quantity,
        unitPrice: p.pricePerUnit,
        totalPrice,
      };
    });

    const subtotal = items.reduce((sum, i) => sum + i.totalPrice, 0);
    const status = pickStatus();
    // Trải createdAt trong 60 ngày gần đây để dashboard "hôm nay/tháng này" có dữ liệu thật
    const baseHoursAgo = randInt(2, 60 * 24);
    const statusHistory = buildStatusHistory(status, baseHoursAgo);
    const createdAt = statusHistory[0].changedAt;

    const order = {
      buyerId: customer._id,
      sellerId: seller._id,
      items,
      shippingAddressSnapshot: {
        recipientName: customer.fullName,
        phone: '09' + randInt(10000000, 99999999),
        address: customer.address,
      },
      subtotal,
      shippingFee: 0,
      totalAmount: subtotal,
      paymentMethod: ['cod', 'bank_transfer', 'vnpay'][randInt(0, 2)],
      status,
      statusHistory,
      createdAt,
    };
    if (status === 'cancelled') {
      order.cancelReason = [
        'Khách hàng đổi ý, không còn nhu cầu',
        'Đặt nhầm sản phẩm',
        'Tìm được nơi bán giá tốt hơn',
        'Thời gian giao hàng quá lâu',
      ][randInt(0, 3)];
    }
    return order;
  }

  // Sau khi sinh xong theo round-robin, đếm lại theo seller/customer và bổ sung
  // order ngẫu nhiên cho bất kỳ ai chưa đạt MIN_ORDERS_PER_ACTOR.
  function topUpToMinimum(orders, sellers, customers, productsBySeller) {
    const countBySeller = new Map();
    const countByCustomer = new Map();
    for (const o of orders) {
      const sKey = o.sellerId.toString();
      const cKey = o.buyerId.toString();
      countBySeller.set(sKey, (countBySeller.get(sKey) || 0) + 1);
      countByCustomer.set(cKey, (countByCustomer.get(cKey) || 0) + 1);
    }

    for (const seller of sellers) {
      const sKey = seller._id.toString();
      while ((countBySeller.get(sKey) || 0) < MIN_ORDERS_PER_ACTOR) {
        // Ưu tiên gán cho customer đang thiếu đơn nhất để cân bằng cả 2 chiều
        const neediest = [...customers].sort(
          (a, b) => (countByCustomer.get(a._id.toString()) || 0) - (countByCustomer.get(b._id.toString()) || 0)
        )[0];
        const order = buildOrder(seller, neediest, productsBySeller);
        if (!order) break;
        orders.push(order);
        countBySeller.set(sKey, (countBySeller.get(sKey) || 0) + 1);
        countByCustomer.set(neediest._id.toString(), (countByCustomer.get(neediest._id.toString()) || 0) + 1);
      }
    }

    for (const customer of customers) {
      const cKey = customer._id.toString();
      while ((countByCustomer.get(cKey) || 0) < MIN_ORDERS_PER_ACTOR) {
        const neediest = [...sellers].sort(
          (a, b) => (countBySeller.get(a._id.toString()) || 0) - (countBySeller.get(b._id.toString()) || 0)
        )[0];
        const order = buildOrder(neediest, customer, productsBySeller);
        if (!order) break;
        orders.push(order);
        countByCustomer.set(cKey, (countByCustomer.get(cKey) || 0) + 1);
        countBySeller.set(neediest._id.toString(), (countBySeller.get(neediest._id.toString()) || 0) + 1);
      }
    }

    return orders;
  }

  const productsBySeller = new Map();
  for (const p of createdProducts) {
    const key = p.sellerId.toString();
    if (!productsBySeller.has(key)) productsBySeller.set(key, []);
    productsBySeller.get(key).push(p);
  }

  const pairs = buildOrderPairs(sellerUsers, customerUsers);
  let ordersToCreate = pairs
    .map(({ seller, customer }) => buildOrder(seller, customer, productsBySeller))
    .filter(Boolean);
  ordersToCreate = topUpToMinimum(ordersToCreate, sellerUsers, customerUsers, productsBySeller);

  const createdOrders = [];
  for (const o of ordersToCreate) {
    const order = await Order.create(o);
    createdOrders.push(order);
  }
  console.log(`🛒 Created ${createdOrders.length} orders`);

  // ── Seed reviews (dựa trên order 'delivered', dedupe theo buyerId+productId) ──
  await Review.deleteMany({ buyerId: { $in: customerUsers.map((u) => u._id) } });
  console.log('🗑️  Cleared existing seed reviews');

  const REVIEW_COMMENTS = {
    5: [
      'Sản phẩm rất tốt, đúng như mô tả. Sẽ ủng hộ tiếp!',
      'Chất lượng tuyệt vời, giao hàng nhanh, đóng gói cẩn thận.',
      'Rất hài lòng, người bán nhiệt tình tư vấn.',
    ],
    4: [
      'Sản phẩm tốt, giao hàng hơi trễ một chút nhưng ổn.',
      'Chất lượng ổn so với giá tiền, sẽ mua lại.',
    ],
    3: [
      'Sản phẩm tạm được, không như kỳ vọng ban đầu.',
      'Đóng gói bình thường, chất lượng chấp nhận được.',
    ],
  };

  const reviewSeen = new Set();
  const reviewsToCreate = [];
  for (const order of createdOrders) {
    if (order.status !== 'delivered') continue;
    if (Math.random() >= 0.6) continue; // 60% order delivered có review

    for (const item of order.items) {
      const dedupeKey = `${order.buyerId}-${item.productId}`;
      if (reviewSeen.has(dedupeKey)) continue;
      reviewSeen.add(dedupeKey);

      const rating = randInt(3, 5);
      const comments = REVIEW_COMMENTS[rating];
      reviewsToCreate.push({
        productId: item.productId,
        buyerId: order.buyerId,
        orderId: order._id,
        rating,
        comment: comments[randInt(0, comments.length - 1)],
      });
    }
  }
  for (const r of reviewsToCreate) {
    await Review.create(r);
  }
  console.log(`⭐ Created ${reviewsToCreate.length} reviews`);

  // ── Seed wishlist (mỗi customer 2-4 sản phẩm ngẫu nhiên, dedupe) ─────────────
  await Wishlist.deleteMany({ user: { $in: customerUsers.map((u) => u._id) } });
  console.log('🗑️  Cleared existing seed wishlists');

  const wishlistsToCreate = [];
  for (const customer of customerUsers) {
    const count = randInt(2, 4);
    const shuffled = [...createdProducts].sort(() => Math.random() - 0.5).slice(0, count);
    for (const p of shuffled) {
      wishlistsToCreate.push({ user: customer._id, product: p._id });
    }
  }
  for (const w of wishlistsToCreate) {
    await Wishlist.create(w);
  }
  console.log(`💚 Created ${wishlistsToCreate.length} wishlist entries`);

  // ── Thống kê kiểm tra ràng buộc ───────────────────────────────────────────────
  console.log('\n📊 Kiểm tra ràng buộc: mỗi seller/customer phải ≥ 5 đơn từ nhiều đối tác khác nhau');
  console.log('─────────────────────────────────────────────────────');
  console.log('SELLERS:');
  for (const seller of sellerUsers) {
    const sellerOrders = createdOrders.filter((o) => o.sellerId.toString() === seller._id.toString());
    const uniqueBuyers = new Set(sellerOrders.map((o) => o.buyerId.toString())).size;
    const ok = sellerOrders.length >= MIN_ORDERS_PER_ACTOR ? '✅' : '❌';
    console.log(`  ${ok} ${seller.fullName.padEnd(40)} ${sellerOrders.length} đơn từ ${uniqueBuyers} khách khác nhau`);
  }
  console.log('CUSTOMERS:');
  for (const customer of customerUsers) {
    const customerOrders = createdOrders.filter((o) => o.buyerId.toString() === customer._id.toString());
    const uniqueSellers = new Set(customerOrders.map((o) => o.sellerId.toString())).size;
    const ok = customerOrders.length >= MIN_ORDERS_PER_ACTOR ? '✅' : '❌';
    console.log(`  ${ok} ${customer.fullName.padEnd(40)} ${customerOrders.length} đơn từ ${uniqueSellers} người bán khác nhau`);
  }
  console.log('─────────────────────────────────────────────────────');

  console.log('\n✅ Seed hoàn tất!');
  console.log('─────────────────────────────────────────────────────');
  console.log(`Tổng: ${USERS.length} users, ${products.length} products, ${createdOrders.length} orders, ${reviewsToCreate.length} reviews, ${wishlistsToCreate.length} wishlists`);
  console.log('Demo accounts (password: demo123):');
  USERS.forEach((u) => console.log(`  ${u.role.padEnd(10)} ${u.email}`));
  console.log('─────────────────────────────────────────────────────');

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err.message);
  process.exit(1);
});
