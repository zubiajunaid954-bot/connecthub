const Message = require('../models/Message');
const { message: toDTO } = require('../utils/serializers');

const history = async (category, { before, limit }) => {
  const filter = { category };
  if (before) filter.createdAt = { $lt: before };
  const docs = await Message.find(filter)
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('author', 'username role')
    .lean();
  return docs.reverse().map(toDTO); // oldest -> newest for rendering
};

const save = async ({ category, userId, body }) => {
  const doc = await Message.create({ category, author: userId, body });
  await doc.populate('author', 'username role');
  return toDTO(doc);
};

module.exports = { history, save };
