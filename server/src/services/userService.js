const User = require('../models/User');
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const ApiError = require('../utils/ApiError');
const { publicUser, comment: commentDTO, pagination } = require('../utils/serializers');

const findByUsername = async (username) => {
  const user = await User.findOne({ username }).lean();
  if (!user) throw new ApiError(404, 'User not found');
  return user;
};

const getProfile = async (username) => {
  const user = await findByUsername(username);
  const [postCount, commentCount, scoreAgg] = await Promise.all([
    Post.countDocuments({ author: user._id }),
    Comment.countDocuments({ author: user._id }),
    Post.aggregate([{ $match: { author: user._id } }, { $group: { _id: null, total: { $sum: '$score' } } }]),
  ]);
  return {
    user: { ...publicUser(user), isBanned: user.isBanned },
    stats: { posts: postCount, comments: commentCount, karma: scoreAgg[0]?.total || 0 },
  };
};

const getComments = async (username, { page, limit }) => {
  const user = await findByUsername(username);
  const [comments, total] = await Promise.all([
    Comment.find({ author: user._id })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('author', 'username role')
      .populate('post', 'title')
      .lean(),
    Comment.countDocuments({ author: user._id }),
  ]);
  return { comments: comments.map(commentDTO), pagination: pagination(page, limit, total) };
};

// Mixed timeline of the user's latest posts and comments.
const getActivity = async (username) => {
  const user = await findByUsername(username);
  const [posts, comments] = await Promise.all([
    Post.find({ author: user._id }).sort({ createdAt: -1 }).limit(15).select('title createdAt category').lean(),
    Comment.find({ author: user._id }).sort({ createdAt: -1 }).limit(15).populate('post', 'title').lean(),
  ]);
  const items = [
    ...posts.map((p) => ({
      type: 'post',
      id: String(p._id),
      post: { id: String(p._id), title: p.title },
      excerpt: null,
      createdAt: p.createdAt,
    })),
    ...comments.map((c) => ({
      type: 'comment',
      id: String(c._id),
      post: c.post ? { id: String(c.post._id), title: c.post.title } : null,
      excerpt: c.body.slice(0, 140),
      createdAt: c.createdAt,
    })),
  ]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 20);
  return { activity: items };
};

const updateBio = async (userId, bio) => {
  const user = await User.findByIdAndUpdate(userId, { bio }, { new: true, runValidators: true });
  return publicUser(user);
};

module.exports = { findByUsername, getProfile, getComments, getActivity, updateBio };
