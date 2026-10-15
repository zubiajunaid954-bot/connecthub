const asyncHandler = require('../utils/asyncHandler');
const authService = require('../services/authService');
const { setAuthCookie, clearAuthCookie } = require('../utils/token');
const { user: toDTO } = require('../utils/serializers');

const register = asyncHandler(async (req, res) => {
  const { user, token } = await authService.register(req.body);
  setAuthCookie(res, token);
  res.status(201).json({ user: toDTO(user) });
});

const login = asyncHandler(async (req, res) => {
  const { user, token } = await authService.login(req.body);
  setAuthCookie(res, token);
  res.json({ user: toDTO(user) });
});

const logout = (req, res) => {
  clearAuthCookie(res);
  res.json({ message: 'Logged out' });
};

const me = (req, res) => res.json({ user: toDTO(req.user) });

module.exports = { register, login, logout, me };
