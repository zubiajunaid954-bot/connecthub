const http = require('http');
const { io: connectClient } = require('socket.io-client');
const app = require('../src/app');
const initSocket = require('../src/sockets');
const { connect, clear, disconnect, signUp, signUpAdmin } = require('./helpers');

let server;
let ioServer;
let url;
const clients = [];

beforeAll(async () => {
  await connect();
  server = http.createServer(app);
  ioServer = initSocket(server);
  await new Promise((resolve) => server.listen(0, resolve));
  url = `http://localhost:${server.address().port}`;
});

afterEach(async () => {
  clients.splice(0).forEach((c) => c.disconnect());
  await clear();
});

afterAll(async () => {
  ioServer.close();
  await disconnect();
});

// Opens a socket authenticated by the same cookie the REST agent received on login.
const open = ({ cookie }) => {
  const socket = connectClient(url, { extraHeaders: { cookie }, transports: ['websocket'], reconnection: false });
  clients.push(socket);
  return new Promise((resolve, reject) => {
    socket.on('connect', () => resolve(socket));
    socket.on('connect_error', reject);
  });
};

const once = (socket, event) => new Promise((resolve) => socket.once(event, resolve));
const emitAck = (socket, event, payload) => new Promise((resolve) => socket.emit(event, payload, resolve));

describe('socket authentication', () => {
  it('rejects connections without a valid session cookie', async () => {
    const socket = connectClient(url, { transports: ['websocket'], reconnection: false });
    clients.push(socket);
    const err = await new Promise((resolve) => socket.on('connect_error', resolve));
    expect(err.message).toBe('Unauthorized');
  });

  it('accepts an authenticated user and broadcasts presence', async () => {
    const alice = await signUp({ username: 'alice' });
    // Presence is broadcast during the handshake, so the listener must exist before connecting.
    const socket = connectClient(url, { extraHeaders: { cookie: alice.cookie }, transports: ['websocket'], reconnection: false });
    clients.push(socket);
    const online = await new Promise((resolve) => {
      socket.on('presence:update', (list) => list.length && resolve(list));
    });
    expect(online.map((u) => u.username)).toContain('alice');
  });
});

describe('chat rooms', () => {
  it('delivers messages and typing events to others in the room and persists messages', async () => {
    const alice = await signUp({ username: 'alice' });
    const bob = await signUp({ username: 'bob' });
    const a = await open(alice);
    const b = await open(bob);

    expect((await emitAck(a, 'room:join', { category: 'react' })).ok).toBe(true);
    expect((await emitAck(b, 'room:join', { category: 'react' })).ok).toBe(true);

    const typing = once(b, 'chat:typing');
    a.emit('chat:typing', { category: 'react', isTyping: true });
    expect(await typing).toMatchObject({ category: 'react', isTyping: true, user: { username: 'alice' } });

    const incoming = once(b, 'chat:message');
    expect((await emitAck(a, 'chat:message', { category: 'react', body: 'hello bob' })).ok).toBe(true);
    expect(await incoming).toMatchObject({ body: 'hello bob', category: 'react', author: { username: 'alice' } });

    const history = await bob.agent.get('/api/chat/react/messages');
    expect(history.body.messages.map((m) => m.body)).toEqual(['hello bob']);
  });

  it('does not deliver messages to users in other rooms', async () => {
    const alice = await signUp({ username: 'alice' });
    const bob = await signUp({ username: 'bob' });
    const a = await open(alice);
    const b = await open(bob);
    await emitAck(a, 'room:join', { category: 'react' });
    await emitAck(b, 'room:join', { category: 'node' });

    const leaked = jest.fn();
    b.on('chat:message', leaked);
    const own = once(a, 'chat:message');
    await emitAck(a, 'chat:message', { category: 'react', body: 'react only' });
    await own;
    await new Promise((r) => setTimeout(r, 150));
    expect(leaked).not.toHaveBeenCalled();
  });

  it('validates payloads and requires joining the room first', async () => {
    const alice = await signUp({ username: 'alice' });
    const a = await open(alice);

    expect((await emitAck(a, 'room:join', { category: 'cooking' })).ok).toBe(false);
    expect((await emitAck(a, 'chat:message', { category: 'react', body: 'hi' })).message).toMatch(/join the room/i);
    await emitAck(a, 'room:join', { category: 'react' });
    expect((await emitAck(a, 'chat:message', { category: 'react', body: '   ' })).ok).toBe(false);
  });

  it('reports who is in the room', async () => {
    const alice = await signUp({ username: 'alice' });
    const a = await open(alice);
    const users = new Promise((resolve) => a.on('room:users', resolve));
    await emitAck(a, 'room:join', { category: 'career' });
    expect(await users).toMatchObject({ category: 'career', users: [{ username: 'alice' }] });
  });
});

describe('live notifications', () => {
  it('pushes a notification to the post author when someone comments', async () => {
    const author = await signUp({ username: 'author' });
    const commenter = await signUp({ username: 'commenter' });
    const authorSocket = await open(author);

    const post = (await author.agent.post('/api/posts').send({ title: 'Notify me', body: 'body text', category: 'general' })).body.post;

    const pushed = once(authorSocket, 'notification:new');
    await commenter.agent.post(`/api/posts/${post.id}/comments`).send({ body: 'first!' });
    expect(await pushed).toMatchObject({ type: 'comment', actor: { username: 'commenter' }, post: { id: post.id, title: 'Notify me' } });
  });
});

describe('moderation', () => {
  it('disconnects a user in real time when an admin bans them', async () => {
    const admin = await signUpAdmin();
    const target = await signUp({ username: 'troll' });
    const socket = await open(target);

    const closed = once(socket, 'disconnect');
    await admin.agent.patch(`/api/admin/users/${target.user.id}/ban`).send({ banned: true });
    expect(await closed).toBeDefined();
  });

  it('shows online users and active rooms in admin stats', async () => {
    const admin = await signUpAdmin();
    const user = await signUp({ username: 'chatter' });
    const socket = await open(user);
    await emitAck(socket, 'room:join', { category: 'node' });

    const { body } = await admin.agent.get('/api/admin/stats');
    expect(body.stats.onlineUsers).toBe(1);
    expect(body.stats.activeRooms).toEqual([{ category: 'node', users: 1 }]);
  });
});
