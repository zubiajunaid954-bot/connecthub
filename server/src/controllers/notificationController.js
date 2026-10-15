const asyncHandler = require('../utils/asyncHandler');
const notificationService = require('../services/notificationService');

const list = asyncHandler(async (req, res) => {
  res.json(await notificationService.list(req.user._id));
});

const markRead = asyncHandler(async (req, res) => {
  await notificationService.markRead(req.user._id, req.params.id);
  res.json({ message: 'Marked as read' });
});

const markAllRead = asyncHandler(async (req, res) => {
  await notificationService.markAllRead(req.user._id);
  res.json({ message: 'All notifications marked as read' });
});

module.exports = { list, markRead, markAllRead };
