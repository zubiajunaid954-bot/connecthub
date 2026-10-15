const User = require('../models/User');
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const Message = require('../models/Message');
const ApiError = require('../utils/ApiError');
const { ROLES } = require('../config/constants');
const { user: toDTO, pagination } = require('../utils/serializers');
const { disconnectUser } = require('../sockets/io');
const { getOnlineUsers, getActiveRooms } = require('../sockets/presence');

const getStats = async () => {
  const [users, bannedUsers, posts, comments, messages, postsByCategory, online, activeRooms] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ isBanned: true }),
    Post.countDocuments(),
    Comment.countDocuments(),
    Message.countDocuments(),
    Post.aggregate([{ $group: { _id: '$category', count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
    getOnlineUsers(),
    getActiveRooms(),
  ]);
  return {
    users,
    bannedUsers,
    posts,
    comments,
    messages,
    onlineUsers: online.length,
    activeRooms,
    postsByCategory: postsByCategory.map((c) => ({ category: c._id, count: c.count })),
  };
};

const listUsers = async ({ page, limit, search }) => {
  const filter = {};
  if (search) {
    const safe = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // escape regex metacharacters
    filter.$or = [{ username: new RegExp(safe, 'i') }, { email: new RegExp(safe, 'i') }];
  }
  const [users, total] = await Promise.all([
    User.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    User.countDocuments(filter),
  ]);
  return { users: users.map(toDTO), pagination: pagination(page, limit, total) };
};

const setBanned = async (actor, targetId, banned) => {
  if (String(actor._id) === String(targetId)) throw new ApiError(400, 'You cannot ban yourself');
  const target = await User.findById(targetId);
  if (!target) throw new ApiError(404, 'User not found');
  if (target.role === ROLES.ADMIN) throw new ApiError(400, 'Admins cannot be banned');
  target.isBanned = banned;
  await target.save();
  if (banned) disconnectUser(target._id); // kick any open sockets right away
  return toDTO(target);
};

module.exports = { getStats, listUsers, setBanned };
