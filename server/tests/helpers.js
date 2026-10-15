const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const request = require('supertest');
const app = require('../src/app');
const User = require('../src/models/User');

let mongod;

// Spins up an in-memory MongoDB so tests need no external database.
const connect = async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  // Build indexes (incl. the text index) up front so search tests are deterministic.
  await Promise.all(Object.values(mongoose.models).map((m) => m.init()));
};

const clear = async () => {
  await Promise.all(Object.values(mongoose.connection.collections).map((c) => c.deleteMany({})));
};

const disconnect = async () => {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
};

let counter = 0;

// Registers a user through the real API and returns a supertest agent that keeps the cookie.
const signUp = async (overrides = {}) => {
  counter += 1;
  const creds = {
    username: `user${counter}`,
    email: `user${counter}@example.com`,
    password: 'Password123',
    ...overrides,
  };
  const agent = request.agent(app);
  const res = await agent.post('/api/auth/register').send(creds);
  const cookie = (res.headers['set-cookie'] || [])[0]?.split(';')[0] || '';
  return { agent, user: res.body.user, creds, cookie };
};

const signUpAdmin = async () => {
  const ctx = await signUp();
  await User.updateOne({ _id: ctx.user.id }, { role: 'admin' });
  return ctx;
};

module.exports = { connect, clear, disconnect, signUp, signUpAdmin };
