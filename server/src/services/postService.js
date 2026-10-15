const mongoose = require('mongoose');
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const Notification = require('../models/Notification');
const ApiError = require('../utils/ApiError');
const { ROLES } = require('../config/constants');
const { post: toDTO, pagination } = require('../utils/serializers');

const SORTS = {
  new: { createdAt: -1 },
  top: { score: -1, createdAt: -1 },
  discussed: { commentCount: -1, createdAt: -1 },
};

const isOwnerOrAdmin = (post, user) =>
  String(post.author._id || post.author) === String(user._id) || user.role === ROLES.ADMIN;

const populateAuthor = (query) => query.populate('author', 'username role');

const list = async (query, viewerId) => {
  const { page, limit, search, category, tag, author } = query;
  const filter = {};
  if (category) filter.category = category;
  if (tag) filter.tags = tag;
  if (author) filter.author = author;
  if (search) filter.$text = { $search: search };

  // With a search term, rank by text relevance unless the user picked another sort.
  const sort = query.sort || (search ? 'relevance' : 'new');
  let find = Post.find(filter);
  if (sort === 'relevance' && search) {
    find = find
      .select({ relevance: { $meta: 'textScore' } })
      .sort({ relevance: { $meta: 'textScore' }, createdAt: -1 });
  } else {
    find = find.sort(SORTS[sort] || SORTS.new);
  }

  const [posts, total] = await Promise.all([
    populateAuthor(find.skip((page - 1) * limit).limit(limit)).lean(),
    Post.countDocuments(filter),
  ]);

  return { posts: posts.map((p) => toDTO(p, viewerId)), pagination: pagination(page, limit, total) };
};

const getById = async (id, viewerId) => {
  const post = await populateAuthor(Post.findById(id)).lean();
  if (!post) throw new ApiError(404, 'Post not found');
  return toDTO(post, viewerId);
};

const create = async (authorId, data) => {
  const post = await Post.create({ ...data, author: authorId });
  await post.populate('author', 'username role');
  return toDTO(post, authorId);
};

const update = async (id, user, data) => {
  const post = await Post.findById(id);
  if (!post) throw new ApiError(404, 'Post not found');
  if (!isOwnerOrAdmin(post, user)) throw new ApiError(403, 'You can only edit your own posts');
  Object.assign(post, data);
  await post.save();
  await post.populate('author', 'username role');
  return toDTO(post, user._id);
};

const remove = async (id, user) => {
  const post = await Post.findById(id);
  if (!post) throw new ApiError(404, 'Post not found');
  if (!isOwnerOrAdmin(post, user)) throw new ApiError(403, 'You can only delete your own posts');
  await Promise.all([
    Comment.deleteMany({ post: post._id }),
    Notification.deleteMany({ post: post._id }),
    post.deleteOne(),
  ]);
};

// value: 1 = upvote, -1 = downvote, 0 = clear my vote.
// One atomic pipeline update: remove the user from both sets, add to the chosen one,
// recompute the score. No read-modify-write, so concurrent votes can't corrupt it.
const vote = async (postId, userId, value) => {
  const uid = new mongoose.Types.ObjectId(String(userId));
  const post = await Post.findByIdAndUpdate(
    postId,
    [
      {
        $set: {
          upvotes: { $setDifference: ['$upvotes', [uid]] },
          downvotes: { $setDifference: ['$downvotes', [uid]] },
        },
      },
      {
        $set: {
          upvotes: value === 1 ? { $setUnion: ['$upvotes', [uid]] } : '$upvotes',
          downvotes: value === -1 ? { $setUnion: ['$downvotes', [uid]] } : '$downvotes',
        },
      },
      { $set: { score: { $subtract: [{ $size: '$upvotes' }, { $size: '$downvotes' }] } } },
    ],
    { new: true, timestamps: false }
  );
  if (!post) throw new ApiError(404, 'Post not found');
  return { score: post.score, userVote: value };
};

module.exports = { list, getById, create, update, remove, vote };
