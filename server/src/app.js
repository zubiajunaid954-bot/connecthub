const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');

const env = require('./config/env');
const routes = require('./routes');
const originGuard = require('./middleware/originGuard');
const { apiLimiter } = require('./middleware/rateLimiter');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();

app.set('trust proxy', 1); // behind Render's proxy: correct client IPs for rate limiting + secure cookies

// The API is consumed cross-origin by the SPA, so don't let helmet's CORP header block it.
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: env.clientOrigins, credentials: true }));
app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());
if (!env.isTest) app.use(morgan(env.isProd ? 'combined' : 'dev'));

app.use('/api', apiLimiter, originGuard, routes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
