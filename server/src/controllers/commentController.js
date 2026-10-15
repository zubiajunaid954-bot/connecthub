const asyncHandler = require('../utils/asyncHandler');
const commentService = require('../services/commentService');

const listForPost = asyncHandler(async (req, res) => {
  res.json(await commentService.listForPost(req.params.id, req.query));
});

const create = asyncHandler(async (req, res) => {
  const comment = await commentService.create(req.params.id, req.user, req.body.body);
  res.status(201).json({ comment });
});

const remove = asyncHandler(async (req, res) => {
  await commentService.remove(req.params.id, req.user);
  res.status(204).end();
});

module.exports = { listForPost, create, remove };
