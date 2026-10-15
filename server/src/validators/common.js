const Joi = require('joi');

const objectId = Joi.string().hex().length(24);

const idParam = Joi.object({ id: objectId.required() });

const usernameParam = Joi.object({
  username: Joi.string().trim().lowercase().pattern(/^[a-z0-9_]+$/).min(3).max(24).required(),
});

const pageQuery = Joi.object({
  page: Joi.number().integer().min(1).max(10000).default(1),
  limit: Joi.number().integer().min(1).max(50).default(10),
});

module.exports = { objectId, idParam, usernameParam, pageQuery };
