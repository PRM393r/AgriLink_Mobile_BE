const request = require('supertest');
const bcrypt = require('bcryptjs');
const User = require('../../modules/users/user.model');
const Otp = require('../../modules/auth/otp.model');

/**
 * Create a verified user and return JWT access token.
 */
const createUserAndLogin = async (app, { email, password = 'Test@1234', role = 'customer', fullName = 'Test User' } = {}) => {
  const hashed = await bcrypt.hash(password, 10);
  const user = await User.create({
    email,
    passwordHash: hashed,
    fullName,
    role,
    isVerified: true,
  });

  const res = await request(app)
    .post('/api/v1/auth/login')
    .send({ email, password });

  return {
    user,
    token: res.body.data?.accessToken ?? '',
    userId: user._id.toString(),
  };
};

module.exports = { createUserAndLogin };
