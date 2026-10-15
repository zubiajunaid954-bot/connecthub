const mongoose = require('mongoose');
const { CATEGORIES } = require('../config/constants');

const messageSchema = new mongoose.Schema(
  {
    category: { type: String, required: true, enum: CATEGORIES },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    body: { type: String, required: true, trim: true, minlength: 1, maxlength: 1000 },
  },
  { timestamps: true }
);

messageSchema.index({ category: 1, createdAt: -1 }); // chat history, newest first

module.exports = mongoose.model('Message', messageSchema);
