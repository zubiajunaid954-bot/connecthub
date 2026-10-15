const { CATEGORIES } = require('../config/constants');
const { getIO } = require('./io');

const roomName = (category) => `room:${category}`;

// A user can have several tabs open = several sockets; collapse to one entry per user.
const uniqueUsers = (sockets) => {
  const byId = new Map();
  sockets.forEach((s) => {
    const u = s.data && s.data.user;
    if (u) byId.set(u.id, { id: u.id, username: u.username });
  });
  return [...byId.values()].sort((a, b) => a.username.localeCompare(b.username));
};

// excludeSocketId lets us compute the list "after this socket leaves" while it is
// still technically connected (used from the `disconnecting` event).
const getOnlineUsers = async (io = getIO(), excludeSocketId) => {
  if (!io) return [];
  const sockets = await io.fetchSockets();
  return uniqueUsers(sockets.filter((s) => s.id !== excludeSocketId));
};

const getRoomUsers = async (category, io = getIO(), excludeSocketId) => {
  if (!io) return [];
  const sockets = await io.in(roomName(category)).fetchSockets();
  return uniqueUsers(sockets.filter((s) => s.id !== excludeSocketId));
};

// Rooms that currently have at least one person in them (used by the admin dashboard).
const getActiveRooms = async (io = getIO()) => {
  if (!io) return [];
  const rooms = await Promise.all(
    CATEGORIES.map(async (category) => ({
      category,
      users: (await getRoomUsers(category, io)).length,
    }))
  );
  return rooms.filter((r) => r.users > 0);
};

module.exports = { roomName, getOnlineUsers, getRoomUsers, getActiveRooms };
