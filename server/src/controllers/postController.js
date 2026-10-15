const asyncHandler = require('../utils/asyncHandler');
const postService = require('../services/postService');

const viewerId = (req) => req.user && req.user._id;

const list = asyncHandler(async (req, res) => {
  res.json(await postService.list(req.query, viewerId(req)));
});

const get = asyncHandler(async (req, res) => {
  res.json({ post: await postService.getById(req.params.id, viewerId(req)) });
});

const create = asyncHandler(async (req, res) => {
  res.status(201).json({ post: await postService.create(req.user._id, req.body) });
});

const update = asyncHandler(async (req, res) => {
  res.json({ post: await postService.update(req.params.id, req.user, req.body) });
});

const remove = asyncHandler(async (req, res) => {
  await postService.remove(req.params.id, req.user);
  res.status(204).end();
});

const vote = asyncHandler(async (req, res) => {
  res.json(await postService.vote(req.params.id, req.user._id, req.body.value));
});

module.exports = { list, get, create, update, remove, vote };
