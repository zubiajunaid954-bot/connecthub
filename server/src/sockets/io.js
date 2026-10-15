// Holds the Socket.io instance so HTTP services can push real-time events
// (notifications, ban disconnects) without importing the server bootstrap.
// Stays null in tests, so every helper is a safe no-op there.
let io = null;

const setIO = (instance) => {
  io = instance;
};
const getIO = () => io;

const emitToUser = (userId, event, payload) => {
  if (io) io.to(`user:${userId}`).emit(event, payload);
};

const disconnectUser = (userId) => {
  if (io) io.in(`user:${userId}`).disconnectSockets(true);
};

module.exports = { setIO, getIO, emitToUser, disconnectUser };
