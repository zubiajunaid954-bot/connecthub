const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { COOKIE_NAME } = require('../config/constants');

const signToken = (userId) =>
  jwt.sign({ sub: String(userId) }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });

const verifyToken = (token) => {
  try {
    return jwt.verify(token, env.jwtSecret);
  } catch {
    return null;
  }
};

// Client (Vercel) and API (Render) live on different sites in production, so the
// cookie must be SameSite=None; Secure. Locally Lax over http is fine.
const baseCookieOptions = () => ({
  httpOnly: true,
  secure: env.isProd,
  sameSite: env.isProd ? 'none' : 'lax',
  path: '/',
});

const setAuthCookie = (res, token) =>
  res.cookie(COOKIE_NAME, token, { ...baseCookieOptions(), maxAge: env.cookieMaxAgeMs });

const clearAuthCookie = (res) => res.clearCookie(COOKIE_NAME, baseCookieOptions());

module.exports = { signToken, verifyToken, setAuthCookie, clearAuthCookie };
