const request = require('supertest');
const { createApp, connectTestDB, disconnectTestDB, clearCollections } = require('./helpers/testSetup');
const { createUserAndLogin } = require('./helpers/authHelper');
const Notification = require('../modules/notifications/notification.model');

let app;
let user, userToken, userId;

beforeAll(async () => {
  await connectTestDB();
  app = createApp();
});

afterAll(async () => {
  await disconnectTestDB();
});

beforeEach(async () => {
  await clearCollections();
  user = await createUserAndLogin(app, { email: 'user@test.com', role: 'customer' });
  userToken = user.token;
  userId    = user.userId;
});

// ─── GET /notifications ────────────────────────────────────────────────────────

describe('GET /api/v1/notifications', () => {
  beforeEach(async () => {
    await Notification.insertMany([
      { userId, type: 'order_created',   title: 'Đơn hàng mới',    body: 'Body 1', isRead: false },
      { userId, type: 'order_confirmed', title: 'Đã xác nhận',     body: 'Body 2', isRead: false },
      { userId, type: 'system',          title: 'Thông báo hệ thống', body: 'Body 3', isRead: true },
    ]);
  });

  test('returns all notifications with unreadCount', async () => {
    const res = await request(app)
      .get('/api/v1/notifications')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.items).toHaveLength(3);
    expect(res.body.data.unreadCount).toBe(2);
  });

  test('filter isRead=false returns only unread', async () => {
    const res = await request(app)
      .get('/api/v1/notifications?isRead=false')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.items).toHaveLength(2);
    expect(res.body.data.items.every(n => !n.isRead)).toBe(true);
  });

  test('filter isRead=true returns only read', async () => {
    const res = await request(app)
      .get('/api/v1/notifications?isRead=true')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.items).toHaveLength(1);
  });

  test('returns 401 without token', async () => {
    const res = await request(app).get('/api/v1/notifications');
    expect(res.status).toBe(401);
  });

  test('user only sees own notifications', async () => {
    const other = await createUserAndLogin(app, { email: 'other@test.com', role: 'customer' });
    await Notification.create({
      userId: other.userId, type: 'system', title: 'Other notif', body: 'x',
    });

    const res = await request(app)
      .get('/api/v1/notifications')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.body.data.items.every(n => n.userId === userId)).toBe(true);
  });
});

// ─── PATCH /notifications/:id/read ────────────────────────────────────────────

describe('PATCH /api/v1/notifications/:id/read', () => {
  let notif;

  beforeEach(async () => {
    notif = await Notification.create({
      userId, type: 'order_created', title: 'Test', body: 'Body', isRead: false,
    });
  });

  test('marks notification as read', async () => {
    const res = await request(app)
      .patch(`/api/v1/notifications/${notif._id}/read`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.isRead).toBe(true);
  });

  test('returns 404 for other user notification', async () => {
    const other = await createUserAndLogin(app, { email: 'other2@test.com', role: 'customer' });
    const res = await request(app)
      .patch(`/api/v1/notifications/${notif._id}/read`)
      .set('Authorization', `Bearer ${other.token}`);

    expect(res.status).toBe(404);
  });
});

// ─── PATCH /notifications/read-all ────────────────────────────────────────────

describe('PATCH /api/v1/notifications/read-all', () => {
  beforeEach(async () => {
    await Notification.insertMany([
      { userId, type: 'order_created',   title: 'N1', body: 'B1', isRead: false },
      { userId, type: 'order_confirmed', title: 'N2', body: 'B2', isRead: false },
    ]);
  });

  test('marks all notifications as read', async () => {
    const res = await request(app)
      .patch('/api/v1/notifications/read-all')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);

    const unread = await Notification.countDocuments({ userId, isRead: false });
    expect(unread).toBe(0);
  });

  test('does not affect other users notifications', async () => {
    const other = await createUserAndLogin(app, { email: 'other3@test.com', role: 'customer' });
    await Notification.create({
      userId: other.userId, type: 'system', title: 'Other', body: 'x', isRead: false,
    });

    await request(app)
      .patch('/api/v1/notifications/read-all')
      .set('Authorization', `Bearer ${userToken}`);

    const otherUnread = await Notification.countDocuments({ userId: other.userId, isRead: false });
    expect(otherUnread).toBe(1);
  });
});
