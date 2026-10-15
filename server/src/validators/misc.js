const Joi = require('joi');
const { CATEGORIES } = require('../config/constants');

const categoryParam = Joi.object({
  category: Joi.string().valid(...CATEGORIES).required(),
});

const chatHistoryQuery = Joi.object({
  before: Joi.date().iso(),
  limit: Joi.number().integer().min(1).max(100).default(50),
});

// Socket payloads are validated with the same Joi library as HTTP bodies.
const socketMessageSchema = Joi.object({
  category: Joi.string().valid(...CATEGORIES).required(),
  body: Joi.string().trim().min(1).max(1000).required(),
});

const socketRoomSchema = Joi.object({
  category: Joi.string().valid(...CATEGORIES).required(),
});

const socketTypingSchema = Joi.object({
  category: Joi.string().valid(...CATEGORIES).required(),
  isTyping: Joi.boolean().required(),
});

const banSchema = Joi.object({ banned: Joi.boolean().required() });

const adminUsersQuery = Joi.object({
  page: Joi.number().integer().min(1).max(10000).default(1),
  limit: Joi.number().integer().min(1).max(50).default(20),
  search: Joi.string().trim().max(50),
});

module.exports = {
  categoryParam,
  chatHistoryQuery,
  socketMessageSchema,
  socketRoomSchema,
  socketTypingSchema,
  banSchema,
  adminUsersQuery,
};
