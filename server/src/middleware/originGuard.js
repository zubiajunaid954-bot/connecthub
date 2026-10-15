const ApiError = require('../utils/ApiError');
const env = require('../config/env');

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

// Cookies are SameSite=None in production (cross-site SPA), which re-opens CSRF.
// Browsers always send Origin on cross-site state-changing requests, so reject any
// unsafe request whose Origin is not our client. Non-browser clients (curl, tests)
// send no Origin and are unaffected - they are not CSRF vectors.
const originGuard = (req, res, next) => {
  if (SAFE_METHODS.has(req.method)) return next();
  const { origin } = req.headers;
  if (origin && !env.clientOrigins.includes(origin)) {
    return next(new ApiError(403, 'Origin not allowed'));
  }
  return next();
};

module.exports = originGuard;
