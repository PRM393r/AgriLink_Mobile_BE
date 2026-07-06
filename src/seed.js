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
  for (const p of products) {
    await Product.create(p);
    console.log(`📦 Created product: ${p.name}`);
  }

  console.log('\n✅ Seed hoàn tất!');
  console.log('─────────────────────────────────────────────────────');
  console.log(`Tổng: ${USERS.length} users, ${products.length} products`);
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
