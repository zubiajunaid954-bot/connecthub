import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { io } from 'socket.io-client';
import { SOCKET_URL } from '../api/client';
import { notificationsApi } from '../api';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

const SocketContext = createContext(null);

// One authenticated socket for the whole app, opened on login and closed on logout.
// It also owns the "global" real-time state: who is online and my notifications.
export function SocketProvider({ children }) {
  const { user } = useAuth();
  const toast = useToast();
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (!user) {
      setSocket(null);
      setConnected(false);
      setOnlineUsers([]);
      setNotifications([]);
      return undefined;
    }

    // The httpOnly cookie is sent with the handshake; the server authenticates from it.
    const s = io(SOCKET_URL, { withCredentials: true });
    setSocket(s);

    s.on('connect', () => setConnected(true));
    s.on('disconnect', () => setConnected(false));
    s.on('presence:update', setOnlineUsers);
    s.on('notification:new', (n) => {
      setNotifications((prev) => [n, ...prev]);
      toast(`${n.actor.username} commented on "${n.post?.title ?? 'your post'}"`, 'info');
    });

    notificationsApi
      .list()
      .then((d) => setNotifications(d.notifications))
      .catch(() => {});

    return () => {
      s.removeAllListeners();
      s.disconnect();
    };
  }, [user?.id, toast]); // eslint-disable-line react-hooks/exhaustive-deps

  const markRead = useCallback(async (id) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    try {
      await notificationsApi.markRead(id);
    } catch {
      /* optimistic update; next page load re-syncs */
    }
  }, []);

  const markAllRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      await notificationsApi.markAllRead();
    } catch {
      /* ignore */
    }
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const value = useMemo(
    () => ({ socket, connected, onlineUsers, notifications, unreadCount, markRead, markAllRead }),
    [socket, connected, onlineUsers, notifications, unreadCount, markRead, markAllRead]
  );

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

export const useSocket = () => useContext(SocketContext);
