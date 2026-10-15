require('dotenv').config();

const nodeEnv = process.env.NODE_ENV || 'development';
const days = Number(process.env.JWT_EXPIRES_DAYS) || 7;

const env = {
  nodeEnv,
  isProd: nodeEnv === 'production',
  isTest: nodeEnv === 'test',
  port: Number(process.env.PORT) || 5000,
  mongoUri: process.env.MONGO_URI,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: `${days}d`,
  cookieMaxAgeMs: days * 24 * 60 * 60 * 1000,
  bcryptRounds: nodeEnv === 'test' ? 4 : 12,
  clientOrigins: (process.env.CLIENT_URL || 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim().replace(/\/$/, ''))
    .filter(Boolean),
};

// Fail fast at boot (called from server.js / seed.js, not on import, so tests can set env first).
env.assertConfigured = () => {
  const missing = ['MONGO_URI', 'JWT_SECRET'].filter((k) => !process.env[k]);
  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
  if (env.isProd && process.env.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters in production');
  }
};

module.exports = env;
