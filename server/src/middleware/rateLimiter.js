const rateLimit = require('express-rate-limit');
const env = require('../config/env');

const make = (windowMs, max, message) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => env.isTest,
    message: { status: 'error', message },
  });

// Whole API: generous, stops scraping / accidental loops.
const apiLimiter = make(15 * 60 * 1000, 600, 'Too many requests, please try again later');
// Login/register: tight, slows credential stuffing.
const authLimiter = make(15 * 60 * 1000, 30, 'Too many attempts, please try again in 15 minutes');
// Creating posts/comments: stops spam bursts.
const writeLimiter = make(60 * 1000, 20, 'You are posting too quickly, slow down a little');

module.exports = { apiLimiter, authLimiter, writeLimiter };
