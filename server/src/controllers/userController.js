const asyncHandler = require('../utils/asyncHandler');
const userService = require('../services/userService');
const postService = require('../services/postService');

const getProfile = asyncHandler(async (req, res) => {
  res.json(await userService.getProfile(req.params.username));
});

const getPosts = asyncHandler(async (req, res) => {
  const user = await userService.findByUsername(req.params.username);
  res.json(await postService.list({ ...req.query, author: String(user._id) }, req.user && req.user._id));
});

const getComments = asyncHandler(async (req, res) => {
  res.json(await userService.getComments(req.params.username, req.query));
});

const getActivity = asyncHandler(async (req, res) => {
  res.json(await userService.getActivity(req.params.username));
});

const updateMe = asyncHandler(async (req, res) => {
  res.json({ user: await userService.updateBio(req.user._id, req.body.bio) });
});

module.exports = { getProfile, getPosts, getComments, getActivity, updateMe };
