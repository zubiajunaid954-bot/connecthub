const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const authService = require('../services/authService');
const { COOKIE_NAME } = require('../config/constants');

// Requires a valid, non-banned session. Re-reads the user on every request so a ban
// or role change takes effect immediately instead of when the JWT expires.
const protect = asyncHandler(async (req, res, next) => {
  const user = await authService.getUserFromToken(req.cookies?.[COOKIE_NAME]);
  if (!user) throw new ApiError(401, 'Authentication required');
  if (user.isBanned) throw new ApiError(403, 'Your account has been banned');
  req.user = user;
  next();
});

// Attaches req.user when logged in but never rejects (public endpoints that personalise,
// e.g. showing which posts the viewer already voted on).
const optionalAuth = asyncHandler(async (req, res, next) => {
  const user = await authService.getUserFromToken(req.cookies?.[COOKIE_NAME]);
  if (user && !user.isBanned) req.user = user;
  next();
});

const requireRole =
  (...roles) =>
  (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new ApiError(403, 'You do not have permission to do that'));
    }
    return next();
  };

module.exports = { protect, optionalAuth, requireRole };
