const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const express = require('express');
const cors = require('cors');

let mongod;

const createApp = () => {
  const app = express();
  app.use(cors());
  app.use(express.json());

  const API = '/api/v1';
  app.use(`${API}/auth`,          require('../../modules/auth/auth.router'));
  app.use(`${API}/users`,         require('../../modules/users/users.router'));
  app.use(`${API}/products`,      require('../../modules/products/products.router'));
  app.use(`${API}/orders`,        require('../../modules/orders/orders.router'));
  app.use(`${API}/notifications`, require('../../modules/notifications/notifications.router'));

  return app;
};

const connectTestDB = async () => {
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  await mongoose.connect(uri);
};

const disconnectTestDB = async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  if (mongod) await mongod.stop();
};

const clearCollections = async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
};

module.exports = { createApp, connectTestDB, disconnectTestDB, clearCollections };
