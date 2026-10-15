const asyncHandler = require('../utils/asyncHandler');
const adminService = require('../services/adminService');

const stats = asyncHandler(async (req, res) => {
  res.json({ stats: await adminService.getStats() });
});

const listUsers = asyncHandler(async (req, res) => {
  res.json(await adminService.listUsers(req.query));
});

const setBanned = asyncHandler(async (req, res) => {
  res.json({ user: await adminService.setBanned(req.user, req.params.id, req.body.banned) });
});

module.exports = { stats, listUsers, setBanned };
