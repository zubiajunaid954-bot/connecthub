import { Link } from 'react-router-dom';
import Avatar from './Avatar';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';

export default function OnlineUsers({ users, title = 'Online now' }) {
  const { user } = useAuth();
  const { connected, onlineUsers } = useSocket();
  const list = users ?? onlineUsers;

  return (
    <section className="card p-4">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800">
        <span className={`h-2 w-2 rounded-full ${user && connected ? 'bg-emerald-500' : 'bg-slate-300'}`} />
        {title}
        <span className="ml-auto text-xs font-normal text-slate-500">{user ? list.length : '–'}</span>
      </h3>
      {!user ? (
        <p className="text-xs text-slate-500">
          <Link to="/login" className="font-medium text-indigo-600 hover:underline">
            Log in
          </Link>{' '}
          to see who is online.
        </p>
      ) : list.length === 0 ? (
        <p className="text-xs text-slate-500">Nobody here yet.</p>
      ) : (
        <ul className="space-y-2">
          {list.map((u) => (
            <li key={u.id}>
              <Link to={`/users/${u.username}`} className="flex items-center gap-2 text-sm text-slate-700 hover:text-indigo-600">
                <Avatar name={u.username} size="sm" />
                <span className="truncate">{u.username}</span>
                {u.id === user.id && <span className="text-xs text-slate-400">(you)</span>}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
