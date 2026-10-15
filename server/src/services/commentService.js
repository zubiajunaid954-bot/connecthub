const Comment = require('../models/Comment');
const Post = require('../models/Post');
const ApiError = require('../utils/ApiError');
const { ROLES } = require('../config/constants');
const { comment: toDTO, pagination } = require('../utils/serializers');
const notificationService = require('./notificationService');

const listForPost = async (postId, { page, limit }) => {
  if (!(await Post.exists({ _id: postId }))) throw new ApiError(404, 'Post not found');
  const [comments, total] = await Promise.all([
    Comment.find({ post: postId })
      .sort({ createdAt: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('author', 'username role')
      .lean(),
    Comment.countDocuments({ post: postId }),
  ]);
  return { comments: comments.map(toDTO), pagination: pagination(page, limit, total) };
};

const create = async (postId, user, body) => {
  const post = await Post.findById(postId).select('author title');
  if (!post) throw new ApiError(404, 'Post not found');

  const comment = await Comment.create({ post: post._id, author: user._id, body });
  await Post.updateOne({ _id: post._id }, { $inc: { commentCount: 1 } }, { timestamps: false });
  await comment.populate('author', 'username role');

  // Real-time "someone commented on your post". Failure to notify must never fail the comment.
  notificationService
    .notifyPostComment({ post, comment, actorId: user._id })
    .catch((err) => console.error('Notification failed:', err.message));

  return toDTO(comment);
};

const remove = async (commentId, user) => {
  const comment = await Comment.findById(commentId);
  if (!comment) throw new ApiError(404, 'Comment not found');
  if (String(comment.author) !== String(user._id) && user.role !== ROLES.ADMIN) {
    throw new ApiError(403, 'You can only delete your own comments');
  }
  await comment.deleteOne();
  await Post.updateOne({ _id: comment.post, commentCount: { $gt: 0 } }, { $inc: { commentCount: -1 } }, { timestamps: false });
};

module.exports = { listForPost, create, remove };
