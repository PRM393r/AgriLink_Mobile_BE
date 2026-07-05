require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const connectDB = require('./config/database');

// Routers
const authRouter = require('./modules/auth/auth.router');
const usersRouter = require('./modules/users/users.router');
const productsRouter = require('./modules/products/products.router');
const ordersRouter = require('./modules/orders/orders.router');
const reviewsRouter = require('./modules/reviews/reviews.router');
const notificationsRouter = require('./modules/notifications/notifications.router');
const storageRouter = require('./modules/storage/storage.router');

const app = express();

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files tĩnh
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ─── Routes (base: /api/v1) ───────────────────────────────────────────────────
const API = '/api/v1';
app.use(`${API}/auth`, authRouter);
app.use(`${API}/users`, usersRouter);
app.use(`${API}/products`, productsRouter);
app.use(`${API}/orders`, ordersRouter);
app.use(`${API}/reviews`, reviewsRouter);
app.use(`${API}/notifications`, notificationsRouter);
app.use(`${API}/storage`, storageRouter);

// Health check
app.get(`${API}/health`, (_req, res) => res.json({ status: 'ok', time: new Date() }));

// 404
app.use((_req, res) => res.status(404).json({ statusCode: 404, message: 'Route not found' }));

// Global error handler
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ statusCode: 500, message: err.message || 'Internal Server Error' });
});

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`AgriLink Mobile Backend running on http://localhost:${PORT}/api/v1`);
    });
  })
  .catch((err) => {
    console.error('MongoDB connection failed:', err.message);
    process.exit(1);
  });
