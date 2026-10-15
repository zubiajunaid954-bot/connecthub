const request = require('supertest');
const app = require('../src/app');
const User = require('../src/models/User');
const { connect, clear, disconnect, signUp, signUpAdmin } = require('./helpers');

beforeAll(connect);
afterEach(clear);
afterAll(disconnect);

const valid = { username: 'alice', email: 'alice@example.com', password: 'Password123' };

describe('POST /api/auth/register', () => {
  it('creates a user, hashes the password and sets an httpOnly cookie', async () => {
    const res = await request(app).post('/api/auth/register').send(valid);

    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({ username: 'alice', email: 'alice@example.com', role: 'user' });
    expect(res.body.user.password).toBeUndefined();

    const cookie = res.headers['set-cookie'].join(';');
    expect(cookie).toMatch(/connecthub_token=/);
    expect(cookie).toMatch(/HttpOnly/i);

    const stored = await User.findOne({ email: valid.email }).select('+password');
    expect(stored.password).not.toBe(valid.password);
    expect(stored.password).toMatch(/^\$2[aby]\$/);
  });

  it('never lets a client self-assign the admin role', async () => {
    const res = await request(app).post('/api/auth/register').send({ ...valid, role: 'admin' });
    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe('user');
  });

  it('rejects a duplicate email with 409', async () => {
    await request(app).post('/api/auth/register').send(valid);
    const res = await request(app).post('/api/auth/register').send({ ...valid, username: 'other' });
    expect(res.status).toBe(409);
  });

  it('rejects a duplicate username with 409', async () => {
    await request(app).post('/api/auth/register').send(valid);
    const res = await request(app).post('/api/auth/register').send({ ...valid, email: 'other@example.com' });
    expect(res.status).toBe(409);
  });

  it.each([
    ['short password', { password: 'abc1' }],
    ['password without number', { password: 'onlyletters' }],
    ['invalid email', { email: 'not-an-email' }],
    ['invalid username', { username: 'bad name!' }],
  ])('rejects %s with 400 and details', async (_label, patch) => {
    const res = await request(app).post('/api/auth/register').send({ ...valid, ...patch });
    expect(res.status).toBe(400);
    expect(res.body.status).toBe('error');
    expect(res.body.details.length).toBeGreaterThan(0);
  });

  it('rejects NoSQL operator payloads', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: { $gt: '' }, password: { $gt: '' } });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    await request(app).post('/api/auth/register').send(valid);
  });

  it('logs in with valid credentials and sets the cookie', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: valid.email, password: valid.password });
    expect(res.status).toBe(200);
    expect(res.body.user.username).toBe('alice');
    expect(res.headers['set-cookie'].join(';')).toMatch(/connecthub_token=/);
  });

  it('returns the same 401 for a wrong password and an unknown email', async () => {
    const wrongPassword = await request(app).post('/api/auth/login').send({ email: valid.email, password: 'Wrong12345' });
    const unknownEmail = await request(app).post('/api/auth/login').send({ email: 'ghost@example.com', password: 'Password123' });
    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    expect(wrongPassword.body.message).toBe(unknownEmail.body.message);
  });

  it('blocks banned users from logging in', async () => {
    await User.updateOne({ email: valid.email }, { isBanned: true });
    const res = await request(app).post('/api/auth/login').send({ email: valid.email, password: valid.password });
    expect(res.status).toBe(403);
  });
});

describe('GET /api/auth/me and POST /api/auth/logout', () => {
  it('requires authentication', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('returns the current user for a valid session', async () => {
    const { agent, user } = await signUp();
    const res = await agent.get('/api/auth/me');
    expect(res.status).toBe(200);
    expect(res.body.user.id).toBe(user.id);
  });

  it('rejects a tampered token', async () => {
    const res = await request(app).get('/api/auth/me').set('Cookie', 'connecthub_token=not.a.jwt');
    expect(res.status).toBe(401);
  });

  it('logout clears the cookie so the session no longer works', async () => {
    const { agent } = await signUp();
    const out = await agent.post('/api/auth/logout');
    expect(out.status).toBe(200);
    expect(out.headers['set-cookie'].join(';')).toMatch(/connecthub_token=;/);
    const res = await agent.get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('a user banned mid-session loses access immediately', async () => {
    const { agent, user } = await signUp();
    await User.updateOne({ _id: user.id }, { isBanned: true });
    const res = await agent.get('/api/auth/me');
    expect(res.status).toBe(403);
  });
});

describe('role protection', () => {
  it('blocks regular users from admin routes and allows admins', async () => {
    const regular = await signUp();
    const admin = await signUpAdmin();

    expect((await regular.agent.get('/api/admin/stats')).status).toBe(403);
    const res = await admin.agent.get('/api/admin/stats');
    expect(res.status).toBe(200);
    expect(res.body.stats.users).toBe(2);
  });

  it('lets an admin ban another user but not themselves', async () => {
    const admin = await signUpAdmin();
    const target = await signUp();

    const banned = await admin.agent.patch(`/api/admin/users/${target.user.id}/ban`).send({ banned: true });
    expect(banned.status).toBe(200);
    expect(banned.body.user.isBanned).toBe(true);
    expect((await target.agent.get('/api/auth/me')).status).toBe(403);

    const self = await admin.agent.patch(`/api/admin/users/${admin.user.id}/ban`).send({ banned: true });
    expect(self.status).toBe(400);
  });
});

describe('origin guard', () => {
  it('rejects state-changing requests from an unknown origin', async () => {
    const res = await request(app).post('/api/auth/login').set('Origin', 'https://evil.example').send({ email: valid.email, password: valid.password });
    expect(res.status).toBe(403);
  });
});
