const { Server } = require('socket.io');
const cookie = require('cookie');

const env = require('../config/env');
const { COOKIE_NAME } = require('../config/constants');
const authService = require('../services/authService');
const chatService = require('../services/chatService');
const { setIO } = require('./io');
const { roomName, getOnlineUsers, getRoomUsers } = require('./presence');
const { socketMessageSchema, socketRoomSchema, socketTypingSchema } = require('../validators/misc');

const MIN_MESSAGE_INTERVAL_MS = 400;

const reply = (ack, payload) => {
  if (typeof ack === 'function') ack(payload);
};

// Validates a payload with Joi and answers through the ack callback on failure.
const parse = (schema, payload, ack) => {
  const { error, value } = schema.validate(payload, { stripUnknown: true });
  if (error) {
    reply(ack, { ok: false, message: error.details[0].message.replace(/"/g, '') });
    return null;
  }
  return value;
};

// Catches async handler errors so one bad event can never crash the process.
const safe = (handler) => async (payload, ack) => {
  try {
    await handler(payload, ack);
  } catch (err) {
    console.error('Socket handler error:', err.message);
    reply(ack, { ok: false, message: 'Something went wrong' });
  }
};

const initSocket = (httpServer) => {
  const io = new Server(httpServer, {
    cors: { origin: env.clientOrigins, credentials: true },
  });
  setIO(io);

  const broadcastPresence = async (excludeSocketId) =>
    io.emit('presence:update', await getOnlineUsers(io, excludeSocketId));

  const broadcastRoom = async (category, excludeSocketId) =>
    io.to(roomName(category)).emit('room:users', {
      category,
      users: await getRoomUsers(category, io, excludeSocketId),
    });

  // Authenticate the handshake with the same httpOnly JWT cookie the REST API uses.
  io.use(async (socket, next) => {
    try {
      const cookies = cookie.parse(socket.handshake.headers.cookie || '');
      const user = await authService.getUserFromToken(cookies[COOKIE_NAME]);
      if (!user) return next(new Error('Unauthorized'));
      if (user.isBanned) return next(new Error('Banned'));
      socket.data.user = { id: String(user._id), username: user.username, role: user.role };
      return next();
    } catch {
      return next(new Error('Unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    const { user } = socket.data;
    let lastMessageAt = 0;

    socket.join(`user:${user.id}`); // personal room: target notifications / kicks at one user
    broadcastPresence().catch(() => {});

    socket.on(
      'room:join',
      safe(async (payload, ack) => {
        const data = parse(socketRoomSchema, payload, ack);
        if (!data) return;
        const previous = [...socket.rooms].filter((r) => r.startsWith('room:') && r !== roomName(data.category));
        previous.forEach((r) => socket.leave(r));
        socket.join(roomName(data.category));
        await Promise.all([data.category, ...previous.map((r) => r.slice(5))].map((c) => broadcastRoom(c)));
        reply(ack, { ok: true });
      })
    );

    socket.on(
      'room:leave',
      safe(async (payload, ack) => {
        const data = parse(socketRoomSchema, payload, ack);
        if (!data) return;
        socket.leave(roomName(data.category));
        await broadcastRoom(data.category);
        reply(ack, { ok: true });
      })
    );

    socket.on(
      'chat:message',
      safe(async (payload, ack) => {
        const data = parse(socketMessageSchema, payload, ack);
        if (!data) return;
        if (!socket.rooms.has(roomName(data.category))) {
          return reply(ack, { ok: false, message: 'Join the room first' });
        }
        const now = Date.now();
        if (now - lastMessageAt < MIN_MESSAGE_INTERVAL_MS) {
          return reply(ack, { ok: false, message: 'You are sending messages too fast' });
        }
        lastMessageAt = now;
        const message = await chatService.save({ category: data.category, userId: user.id, body: data.body });
        io.to(roomName(data.category)).emit('chat:message', message);
        return reply(ack, { ok: true });
      })
    );

    socket.on(
      'chat:typing',
      safe(async (payload) => {
        const data = parse(socketTypingSchema, payload);
        if (!data || !socket.rooms.has(roomName(data.category))) return;
        socket.to(roomName(data.category)).emit('chat:typing', {
          category: data.category,
          user: { id: user.id, username: user.username },
          isTyping: data.isTyping,
        });
      })
    );

    // `disconnecting` (not `disconnect`) still exposes socket.rooms, so we know which
    // rooms need their member list refreshed.
    socket.on('disconnecting', () => {
      const rooms = [...socket.rooms].filter((r) => r.startsWith('room:')).map((r) => r.slice(5));
      broadcastPresence(socket.id).catch(() => {});
      rooms.forEach((c) => broadcastRoom(c, socket.id).catch(() => {}));
    });
  });

  return io;
};

module.exports = initSocket;
