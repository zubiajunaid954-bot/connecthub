const asyncHandler = require('../utils/asyncHandler');
const chatService = require('../services/chatService');

const history = asyncHandler(async (req, res) => {
  res.json({ messages: await chatService.history(req.params.category, req.query) });
});

module.exports = { history };
