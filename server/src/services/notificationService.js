const Notification = require('../models/Notification');
const ApiError = require('../utils/ApiError');
const { notification: toDTO, pagination } = require('../utils/serializers');
const { emitToUser } = require('../sockets/io');

const POPULATE = [
  { path: 'actor', select: 'username role' },
  { path: 'post', select: 'title' },
];

// Persist, then push over the socket so the recipient sees it instantly if online
// and still finds it in the bell dropdown later if not.
const notifyPostComment = async ({ post, comment, actorId }) => {
  if (String(post.author) === String(actorId)) return null; // don't notify yourself
  const doc = await Notification.create({
    recipient: post.author,
    actor: actorId,
    post: post._id,
    comment: comment._id,
    type: 'comment',
  });
  await doc.populate(POPULATE);
  const dto = toDTO(doc);
  emitToUser(post.author, 'notification:new', dto);
  return dto;
};

const list = async (userId, { limit = 30 } = {}) => {
  const [docs, unread] = await Promise.all([
    Notification.find({ recipient: userId }).sort({ createdAt: -1 }).limit(limit).populate(POPULATE).lean(),
    Notification.countDocuments({ recipient: userId, read: false }),
  ]);
  return { notifications: docs.map(toDTO), unread, pagination: pagination(1, limit, docs.length) };
};

const markRead = async (userId, id) => {
  const doc = await Notification.findOneAndUpdate({ _id: id, recipient: userId }, { read: true }, { new: true });
  if (!doc) throw new ApiError(404, 'Notification not found');
};

const markAllRead = (userId) => Notification.updateMany({ recipient: userId, read: false }, { read: true });

module.exports = { notifyPostComment, list, markRead, markAllRead };
