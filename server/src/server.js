const http = require('http');
const mongoose = require('mongoose');

const env = require('./config/env');
const connectDB = require('./config/db');
const app = require('./app');
const initSocket = require('./sockets');

const start = async () => {
  env.assertConfigured();
  await connectDB(env.mongoUri);

  const server = http.createServer(app);
  initSocket(server);

  server.listen(env.port, () => {
    console.log(`ConnectHub API listening on :${env.port} (${env.nodeEnv})`);
  });

  const shutdown = (signal) => {
    console.log(`${signal} received, shutting down...`);
    server.close(async () => {
      await mongoose.connection.close();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
};

start().catch((err) => {
  console.error('Failed to start server:', err.message);
  process.exit(1);
});
