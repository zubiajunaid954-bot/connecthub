const Joi = require('joi');
const { CATEGORIES } = require('../config/constants');
const { objectId } = require('./common');

const tags = Joi.array()
  .items(
    Joi.string()
      .trim()
      .lowercase()
      .pattern(/^[a-z0-9+#.-]+$/)
      .min(1)
      .max(24)
  )
  .max(5)
  .unique();

const createPostSchema = Joi.object({
  title: Joi.string().trim().min(3).max(150).required(),
  body: Joi.string().trim().min(1).max(10000).required(),
  category: Joi.string().valid(...CATEGORIES).required(),
  tags: tags.default([]),
});

const updatePostSchema = Joi.object({
  title: Joi.string().trim().min(3).max(150),
  body: Joi.string().trim().min(1).max(10000),
  category: Joi.string().valid(...CATEGORIES),
  tags,
}).min(1);

const listPostsQuery = Joi.object({
  page: Joi.number().integer().min(1).max(10000).default(1),
  limit: Joi.number().integer().min(1).max(50).default(10),
  search: Joi.string().trim().max(100),
  category: Joi.string().valid(...CATEGORIES),
  tag: Joi.string().trim().lowercase().max(24),
  author: objectId,
  sort: Joi.string().valid('new', 'top', 'discussed', 'relevance'),
});

const voteSchema = Joi.object({
  value: Joi.number().valid(1, -1, 0).required(),
});

const commentSchema = Joi.object({
  body: Joi.string().trim().min(1).max(2000).required(),
});

const listCommentsQuery = Joi.object({
  page: Joi.number().integer().min(1).max(10000).default(1),
  limit: Joi.number().integer().min(1).max(100).default(50),
});

module.exports = {
  createPostSchema,
  updatePostSchema,
  listPostsQuery,
  voteSchema,
  commentSchema,
  listCommentsQuery,
};
