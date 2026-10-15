const Joi = require('joi');

// bcrypt ignores bytes past 72, so cap there to avoid silent truncation.
const password = Joi.string()
  .min(8)
  .max(72)
  .pattern(/[A-Za-z]/, 'letter')
  .pattern(/\d/, 'number')
  .messages({
    'string.pattern.name': 'Password must contain at least one letter and one number',
  });

const registerSchema = Joi.object({
  username: Joi.string()
    .trim()
    .lowercase()
    .pattern(/^[a-z0-9_]+$/)
    .min(3)
    .max(24)
    .required()
    .messages({ 'string.pattern.base': 'Username may only contain letters, numbers and underscores' }),
  email: Joi.string().trim().lowercase().email().max(254).required(),
  password: password.required(),
});

const loginSchema = Joi.object({
  email: Joi.string().trim().lowercase().email().required(),
  password: Joi.string().max(72).required(),
});

const updateProfileSchema = Joi.object({
  bio: Joi.string().trim().allow('').max(280).required(),
});

module.exports = { registerSchema, loginSchema, updateProfileSchema };
