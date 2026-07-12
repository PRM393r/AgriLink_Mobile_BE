const request = require('supertest');
const { createApp, connectTestDB, disconnectTestDB, clearCollections } = require('./helpers/testSetup');
const { createUserAndLogin } = require('./helpers/authHelper');
const Product = require('../modules/products/product.model');
const Order = require('../modules/orders/order.model');
const Notification = require('../modules/notifications/notification.model');

let app;
let buyer, seller;
let buyerToken, sellerToken;
let testProduct;

beforeAll(async () => {
  await connectTestDB();
  app = createApp();
});

afterAll(async () => {
  await disconnectTestDB();
});

beforeEach(async () => {
  await clearCollections();

  buyer  = await createUserAndLogin(app, { email: 'buyer@test.com',  role: 'customer', fullName: 'Nguyen Buyer' });
  seller = await createUserAndLogin(app, { email: 'seller@test.com', role: 'farmer',   fullName: 'Le Seller' });
  buyerToken  = buyer.token;
  sellerToken = seller.token;

  testProduct = await Product.create({
    sellerId:           seller.userId,
    sellerType:         'farmer',
    name:               'Cà chua bi organic',
    description:        'Cà chua sạch Đà Lạt',
    category:           'Rau củ',
    pricePerUnit:       35000,
    unit:               'kg',
    availableQuantity:  100,
    status:             'active',
    farmingType:        'organic',
  });
});

// ─── POST /orders ──────────────────────────────────────────────────────────────

describe('POST /api/v1/orders', () => {
  const validBody = () => ({
    items: [{ productId: testProduct._id.toString(), quantity: 2 }],
    shippingAddressSnapshot: {
      recipientName: 'Nguyen Buyer',
      phone: '0901234567',
      address: '123 Lê Lợi, Q.1, TP.HCM',
    },
    paymentMethod: 'cod',
  });

  test('buyer can create order → returns 201 with orderCode', async () => {
    const res = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send(validBody());

    expect(res.status).toBe(201);
    expect(res.body.data.orderCode).toMatch(/^AGL-/);
    expect(res.body.data.totalAmount).toBe(70000); // 35000 * 2
    expect(res.body.data.status).toBe('pending');
  });

  test('order creates notification for seller', async () => {
    await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send(validBody());

    // Give async notification time to save
    await new Promise(r => setTimeout(r, 100));

    const notif = await Notification.findOne({ userId: seller.userId, type: 'order_created' });
    expect(notif).not.toBeNull();
    expect(notif.title).toBe('Có khách đặt hàng');
  });

  test('returns 400 if items empty', async () => {
    const res = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ ...validBody(), items: [] });

    expect(res.status).toBe(400);
  });

  test('returns 400 if shippingAddress missing', async () => {
    const res = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ items: validBody().items, paymentMethod: 'cod' });

    expect(res.status).toBe(400);
  });

  test('returns 401 if no auth token', async () => {
    const res = await request(app)
      .post('/api/v1/orders')
      .send(validBody());

    expect(res.status).toBe(401);
  });

  test('returns 404 if product does not exist', async () => {
    const res = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({
        ...validBody(),
        items: [{ productId: '000000000000000000000001', quantity: 1 }],
      });

    expect(res.status).toBe(404);
  });
});

// ─── GET /orders ───────────────────────────────────────────────────────────────

describe('GET /api/v1/orders', () => {
  beforeEach(async () => {
    await Order.create({
      buyerId:     buyer.userId,
      sellerId:    seller.userId,
      items: [{
        productId: testProduct._id,
        productSnapshot: { name: 'Cà chua bi organic', unit: 'kg' },
        quantity: 1, unitPrice: 35000, totalPrice: 35000,
      }],
      shippingAddressSnapshot: { recipientName: 'Buyer', phone: '0901234567', address: 'HCM' },
      subtotal: 35000, shippingFee: 0, totalAmount: 35000,
    });
  });

  test('buyer sees own orders', async () => {
    const res = await request(app)
      .get('/api/v1/orders')
      .set('Authorization', `Bearer ${buyerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.items).toHaveLength(1);
    expect(res.body.data.items[0].buyerId).toBe(buyer.userId);
  });

  test('seller sees own seller orders', async () => {
    const res = await request(app)
      .get('/api/v1/orders')
      .set('Authorization', `Bearer ${sellerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.items).toHaveLength(1);
    expect(res.body.data.items[0].sellerId).toBe(seller.userId);
  });

  test('filter by status works', async () => {
    const res = await request(app)
      .get('/api/v1/orders?status=shipped')
      .set('Authorization', `Bearer ${buyerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.items).toHaveLength(0);
  });

  test('returns 401 without token', async () => {
    const res = await request(app).get('/api/v1/orders');
    expect(res.status).toBe(401);
  });
});

// ─── PATCH /orders/:id/status ──────────────────────────────────────────────────

describe('PATCH /api/v1/orders/:id/status', () => {
  let order;

  beforeEach(async () => {
    order = await Order.create({
      buyerId:  buyer.userId,
      sellerId: seller.userId,
      items: [{
        productId: testProduct._id,
        productSnapshot: { name: 'Cà chua bi organic', unit: 'kg' },
        quantity: 2, unitPrice: 35000, totalPrice: 70000,
      }],
      shippingAddressSnapshot: { recipientName: 'Buyer', phone: '0901234567', address: 'HCM' },
      subtotal: 70000, shippingFee: 0, totalAmount: 70000,
    });
  });

  test('seller can confirm order (pending → confirmed)', async () => {
    const res = await request(app)
      .patch(`/api/v1/orders/${order._id}/status`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({ status: 'confirmed' });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('confirmed');
  });

  test('status update notifies buyer', async () => {
    await request(app)
      .patch(`/api/v1/orders/${order._id}/status`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({ status: 'confirmed' });

    await new Promise(r => setTimeout(r, 100));

    const notif = await Notification.findOne({ userId: buyer.userId, type: 'order_confirmed' });
    expect(notif).not.toBeNull();
    expect(notif.title).toBe('Đơn hàng Đã xác nhận');
  });

  test('seller can advance: confirmed → preparing → shipping → delivered', async () => {
    const statuses = ['confirmed', 'preparing', 'shipping', 'delivered'];
    for (const s of statuses) {
      const res = await request(app)
        .patch(`/api/v1/orders/${order._id}/status`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({ status: s });
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe(s);
    }
  });

  test('seller can cancel with reason', async () => {
    const res = await request(app)
      .patch(`/api/v1/orders/${order._id}/status`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({ status: 'cancelled', cancelReason: 'Hết hàng' });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('cancelled');
    expect(res.body.data.cancelReason).toBe('Hết hàng');
  });

  test('buyer cannot update order status', async () => {
    const res = await request(app)
      .patch(`/api/v1/orders/${order._id}/status`)
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ status: 'confirmed' });

    expect(res.status).toBe(403);
  });

  test('returns 400 for invalid status', async () => {
    const res = await request(app)
      .patch(`/api/v1/orders/${order._id}/status`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({ status: 'banana' });

    expect(res.status).toBe(400);
  });

  test('returns 404 for non-existent order', async () => {
    const res = await request(app)
      .patch('/api/v1/orders/000000000000000000000001/status')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({ status: 'confirmed' });

    expect(res.status).toBe(404);
  });
});

// ─── GET /orders/:id ───────────────────────────────────────────────────────────

describe('GET /api/v1/orders/:id', () => {
  let order;

  beforeEach(async () => {
    order = await Order.create({
      buyerId:  buyer.userId,
      sellerId: seller.userId,
      items: [{
        productId: testProduct._id,
        productSnapshot: { name: 'Cà chua bi organic', unit: 'kg' },
        quantity: 1, unitPrice: 35000, totalPrice: 35000,
      }],
      shippingAddressSnapshot: { recipientName: 'Buyer', phone: '0901234567', address: 'HCM' },
      subtotal: 35000, shippingFee: 0, totalAmount: 35000,
    });
  });

  test('buyer can view own order', async () => {
    const res = await request(app)
      .get(`/api/v1/orders/${order._id}`)
      .set('Authorization', `Bearer ${buyerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data._id).toBe(order._id.toString());
  });

  test('seller can view own order', async () => {
    const res = await request(app)
      .get(`/api/v1/orders/${order._id}`)
      .set('Authorization', `Bearer ${sellerToken}`);

    expect(res.status).toBe(200);
  });

  test('third party cannot view order', async () => {
    const other = await createUserAndLogin(app, { email: 'other@test.com', role: 'customer' });
    const res = await request(app)
      .get(`/api/v1/orders/${order._id}`)
      .set('Authorization', `Bearer ${other.token}`);

    expect(res.status).toBe(403);
  });
});
