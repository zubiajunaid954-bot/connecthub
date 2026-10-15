import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { chatApi, errorMessage } from '../api';
import { CATEGORIES, categoryOf } from '../constants';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import Avatar from '../components/Avatar';
import OnlineUsers from '../components/OnlineUsers';
import Spinner from '../components/Spinner';
import ErrorMessage from '../components/ErrorMessage';
import { formatTime } from '../utils/format';

const TYPING_TIMEOUT_MS = 3000;

export default function Chat() {
  const { category } = useParams();
  const { user } = useAuth();
  const { socket, connected } = useSocket();
  const navigate = useNavigate();

  const [messages, setMessages] = useState([]);
  const [roomUsers, setRoomUsers] = useState([]);
  const [typing, setTyping] = useState({}); // { userId: username }
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sendError, setSendError] = useState('');

  const bottomRef = useRef(null);
  const typingTimers = useRef({});
  const stopTypingTimer = useRef(null);
  const isTypingRef = useRef(false);

  const valid = CATEGORIES.some((c) => c.slug === category);

  // Load history over REST whenever the room changes.
  useEffect(() => {
    if (!valid) return undefined;
    let ignore = false;
    setLoading(true);
    setError('');
    setMessages([]);
    setTyping({});
    chatApi
      .history(category)
      .then((d) => !ignore && setMessages(d.messages))
      .catch((err) => !ignore && setError(errorMessage(err)))
      .finally(() => !ignore && setLoading(false));
    return () => {
      ignore = true;
    };
  }, [category, valid]);

  // Join the socket room + subscribe to live events. Re-joins automatically after a reconnect.
  useEffect(() => {
    if (!socket || !valid) return undefined;

    const join = () => socket.emit('room:join', { category }, (res) => res && !res.ok && setError(res.message));
    const timers = typingTimers.current;

    const onMessage = (m) => {
      if (m.category !== category) return;
      setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
      setTyping((t) => {
        const { [m.author.id]: _gone, ...rest } = t;
        return rest;
      });
    };
    const onRoomUsers = (p) => p.category === category && setRoomUsers(p.users);
    const onTyping = ({ category: c, user: u, isTyping }) => {
      if (c !== category || u.id === user.id) return;
      clearTimeout(timers[u.id]);
      if (isTyping) {
        setTyping((t) => ({ ...t, [u.id]: u.username }));
        // Safety net in case the "stopped typing" event is lost.
        timers[u.id] = setTimeout(() => setTyping(({ [u.id]: _x, ...rest }) => rest), TYPING_TIMEOUT_MS);
      } else {
        setTyping(({ [u.id]: _x, ...rest }) => rest);
      }
    };

    socket.on('chat:message', onMessage);
    socket.on('room:users', onRoomUsers);
    socket.on('chat:typing', onTyping);
    socket.on('connect', join);
    if (socket.connected) join();

    return () => {
      socket.off('chat:message', onMessage);
      socket.off('room:users', onRoomUsers);
      socket.off('chat:typing', onTyping);
      socket.off('connect', join);
      socket.emit('room:leave', { category });
      Object.values(timers).forEach(clearTimeout);
      setRoomUsers([]);
    };
  }, [socket, category, valid, user.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length]);

  const emitTyping = useCallback(
    (isTyping) => {
      if (!socket || isTypingRef.current === isTyping) return;
      isTypingRef.current = isTyping;
      socket.emit('chat:typing', { category, isTyping });
    },
    [socket, category]
  );

  useEffect(() => () => {
    clearTimeout(stopTypingTimer.current);
    isTypingRef.current = false;
  }, [category]);

  const onDraftChange = (e) => {
    setDraft(e.target.value);
    setSendError('');
    emitTyping(e.target.value.length > 0);
    clearTimeout(stopTypingTimer.current);
    stopTypingTimer.current = setTimeout(() => emitTyping(false), 1500);
  };

  const send = (e) => {
    e.preventDefault();
    const body = draft.trim();
    if (!body || !socket) return;
    clearTimeout(stopTypingTimer.current);
    emitTyping(false);
    socket.emit('chat:message', { category, body }, (res) => {
      if (res && !res.ok) {
        setSendError(res.message);
        setDraft(body);
      }
    });
    setDraft('');
  };

  if (!category) return <Navigate to="/chat/general" replace />;
  if (!valid) return <Navigate to="/chat/general" replace />;

  const typers = Object.values(typing);
  const room = categoryOf(category);

  return (
    <div className="grid gap-4 lg:grid-cols-[14rem_1fr_14rem]">
      {/* Room list */}
      <aside className="card h-fit p-3">
        <h2 className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Rooms</h2>
        <nav className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
          {CATEGORIES.map((c) => (
            <button
              key={c.slug}
              onClick={() => navigate(`/chat/${c.slug}`)}
              className={`shrink-0 rounded-lg px-3 py-2 text-left text-sm ${c.slug === category ? 'bg-indigo-50 font-semibold text-indigo-700' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              # {c.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Conversation */}
      <section className="card flex h-[70vh] min-h-96 min-w-0 flex-col">
        <header className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <h1 className="font-semibold"># {room.label}</h1>
          <span className={`flex items-center gap-1.5 text-xs ${connected ? 'text-emerald-600' : 'text-amber-600'}`}>
            <span className={`h-2 w-2 rounded-full ${connected ? 'bg-emerald-500' : 'bg-amber-500'}`} />
            {connected ? 'Live' : 'Reconnecting…'}
          </span>
        </header>

        <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
          <ErrorMessage message={error} />
          {loading ? (
            <Spinner label="Loading messages…" />
          ) : messages.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-500">No messages yet. Say hello 👋</p>
          ) : (
            messages.map((m) => {
              const mine = m.author.id === user.id;
              return (
                <div key={m.id} className={`flex items-end gap-2 ${mine ? 'flex-row-reverse' : ''}`}>
                  <Avatar name={m.author.username} size="sm" />
                  <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${mine ? 'rounded-br-sm bg-indigo-600 text-white' : 'rounded-bl-sm bg-slate-100 text-slate-800'}`}>
                    {!mine && (
                      <Link to={`/users/${m.author.username}`} className="mb-0.5 block text-xs font-semibold text-indigo-700 hover:underline">
                        {m.author.username}
                      </Link>
                    )}
                    <p className="whitespace-pre-wrap break-words">{m.body}</p>
                    <span className={`mt-1 block text-right text-[10px] ${mine ? 'text-indigo-200' : 'text-slate-400'}`}>{formatTime(m.createdAt)}</span>
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        <div className="h-5 px-4 text-xs italic text-slate-500" aria-live="polite">
          {typers.length === 1 && `${typers[0]} is typing…`}
          {typers.length === 2 && `${typers[0]} and ${typers[1]} are typing…`}
          {typers.length > 2 && 'Several people are typing…'}
        </div>

        <form onSubmit={send} className="border-t border-slate-100 p-3">
          {sendError && <p className="mb-2 text-xs text-red-600">{sendError}</p>}
          <div className="flex gap-2">
            <input
              className="input"
              value={draft}
              onChange={onDraftChange}
              maxLength={1000}
              placeholder={`Message #${room.label}`}
              aria-label="Message"
              disabled={!connected}
            />
            <button className="btn-primary" disabled={!connected || !draft.trim()}>
              Send
            </button>
          </div>
        </form>
      </section>

      {/* Presence */}
      <aside className="space-y-4">
        <OnlineUsers users={roomUsers} title="In this room" />
        <OnlineUsers title="Online now" />
      </aside>
    </div>
  );
}
