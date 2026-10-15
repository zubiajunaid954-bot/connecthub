const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const { signToken, verifyToken } = require('../utils/token');

const register = async ({ username, email, password }) => {
  const existing = await User.findOne({ $or: [{ email }, { username }] }).select('email username');
  if (existing) {
    throw new ApiError(409, existing.email === email ? 'Email is already registered' : 'Username is already taken');
  }
  const user = await User.create({ username, email, password });
  return { user, token: signToken(user._id) };
};

const login = async ({ email, password }) => {
  const user = await User.findOne({ email }).select('+password');
  // Same message for unknown email and wrong password: don't reveal which accounts exist.
  if (!user || !(await user.comparePassword(password))) {
    throw new ApiError(401, 'Invalid email or password');
  }
  if (user.isBanned) throw new ApiError(403, 'Your account has been banned');
  return { user, token: signToken(user._id) };
};

// Shared by the HTTP `protect` middleware and the Socket.io handshake.
const getUserFromToken = async (token) => {
  if (!token) return null;
  const payload = verifyToken(token);
  if (!payload) return null;
  try {
    return await User.findById(payload.sub);
  } catch {
    return null;
  }
};

module.exports = { register, login, getUserFromToken };
