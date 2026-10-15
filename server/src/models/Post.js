const mongoose = require('mongoose');
const { CATEGORIES } = require('../config/constants');

const postSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, minlength: 3, maxlength: 150 },
    body: { type: String, required: true, trim: true, maxlength: 10000 },
    category: { type: String, required: true, enum: CATEGORIES },
    tags: { type: [String], default: [] },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    upvotes: { type: [mongoose.Schema.Types.ObjectId], default: [] },
    downvotes: { type: [mongoose.Schema.Types.ObjectId], default: [] },
    // Denormalised so "top" sorting is an indexed range scan, not a computed field.
    score: { type: Number, default: 0 },
    commentCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Indexes match the list endpoint's filter + sort combinations.
postSchema.index({ createdAt: -1 });
postSchema.index({ category: 1, createdAt: -1 });
postSchema.index({ score: -1, createdAt: -1 });
postSchema.index({ commentCount: -1, createdAt: -1 });
postSchema.index({ author: 1, createdAt: -1 });
postSchema.index({ tags: 1, createdAt: -1 });
postSchema.index(
  { title: 'text', body: 'text', tags: 'text' },
  { weights: { title: 10, tags: 5, body: 1 }, name: 'post_text_search' }
);

module.exports = mongoose.model('Post', postSchema);
