import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminApi, postsApi, errorMessage } from '../api';
import { categoryOf } from '../constants';
import { useToast } from '../context/ToastContext';
import useDebounce from '../hooks/useDebounce';
import Spinner from '../components/Spinner';
import ErrorMessage from '../components/ErrorMessage';
import Pagination from '../components/Pagination';
import { formatDate, timeAgo } from '../utils/format';

const StatCard = ({ label, value, hint }) => (
  <div className="card p-4">
    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
    <p className="mt-1 text-3xl font-bold text-slate-900">{value}</p>
    {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
  </div>
);

export default function Admin() {
  const toast = useToast();
  const [stats, setStats] = useState(null);
  const [statsError, setStatsError] = useState('');
  const [users, setUsers] = useState({ users: [], pagination: { page: 1, pages: 1 } });
  const [usersLoading, setUsersLoading] = useState(true);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 400);
  const [page, setPage] = useState(1);
  const [posts, setPosts] = useState([]);

  const loadStats = useCallback(() => {
    adminApi.stats().then((d) => setStats(d.stats)).catch((err) => setStatsError(errorMessage(err)));
  }, []);

  const loadPosts = useCallback(() => {
    postsApi.list({ limit: 8 }).then((d) => setPosts(d.posts)).catch(() => {});
  }, []);

  const loadUsers = useCallback(() => {
    setUsersLoading(true);
    adminApi
      .users({ page, limit: 10, search: debouncedSearch || undefined })
      .then(setUsers)
      .catch((err) => toast(errorMessage(err), 'error'))
      .finally(() => setUsersLoading(false));
  }, [page, debouncedSearch, toast]);

  useEffect(() => {
    loadStats();
    loadPosts();
    const id = setInterval(loadStats, 15000); // keep online/room numbers fresh
    return () => clearInterval(id);
  }, [loadStats, loadPosts]);

  useEffect(() => loadUsers(), [loadUsers]);
  useEffect(() => setPage(1), [debouncedSearch]);

  const toggleBan = async (u) => {
    const banned = !u.isBanned;
    if (!window.confirm(`${banned ? 'Ban' : 'Unban'} ${u.username}?`)) return;
    try {
      const { user } = await adminApi.setBanned(u.id, banned);
      setUsers((prev) => ({ ...prev, users: prev.users.map((x) => (x.id === user.id ? user : x)) }));
      toast(`${user.username} ${banned ? 'banned' : 'unbanned'}`, 'success');
      loadStats();
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  };

  const deletePost = async (p) => {
    if (!window.confirm(`Delete "${p.title}" and its comments?`)) return;
    try {
      await postsApi.remove(p.id);
      setPosts((prev) => prev.filter((x) => x.id !== p.id));
      toast('Post deleted', 'success');
      loadStats();
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  };

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Admin dashboard</h1>

      <section aria-label="Statistics">
        <ErrorMessage message={statsError} onRetry={loadStats} />
        {!stats && !statsError ? (
          <Spinner label="Loading stats…" className="py-6" />
        ) : (
          stats && (
            <>
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <StatCard label="Users" value={stats.users} hint={`${stats.bannedUsers} banned`} />
                <StatCard label="Posts" value={stats.posts} hint={`${stats.comments} comments`} />
                <StatCard label="Online now" value={stats.onlineUsers} hint={`${stats.messages} chat messages total`} />
                <StatCard label="Active rooms" value={stats.activeRooms.length} hint={stats.activeRooms.map((r) => `${categoryOf(r.category).label} (${r.users})`).join(', ') || 'No one chatting'} />
              </div>

              <div className="card mt-4 p-4">
                <h2 className="mb-3 text-sm font-semibold">Posts by category</h2>
                <ul className="space-y-2">
                  {stats.postsByCategory.map((c) => (
                    <li key={c.category} className="flex items-center gap-3 text-sm">
                      <span className="w-24 shrink-0 text-slate-600">{categoryOf(c.category).label}</span>
                      <div className="h-2 flex-1 rounded-full bg-slate-100">
                        <div className="h-2 rounded-full bg-indigo-500" style={{ width: `${Math.max(4, (c.count / stats.posts) * 100)}%` }} />
                      </div>
                      <span className="w-8 text-right tabular-nums text-slate-700">{c.count}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )
        )}
      </section>

      <section aria-label="Latest posts">
        <h2 className="mb-3 text-lg font-semibold">Moderate latest posts</h2>
        <div className="card divide-y divide-slate-100">
          {posts.length === 0 && <p className="p-4 text-sm text-slate-500">No posts.</p>}
          {posts.map((p) => (
            <div key={p.id} className="flex items-center gap-3 px-4 py-3 text-sm">
              <div className="min-w-0 flex-1">
                <Link to={`/posts/${p.id}`} className="block truncate font-medium hover:text-indigo-600">{p.title}</Link>
                <span className="text-xs text-slate-500">by {p.author.username} · {timeAgo(p.createdAt)} · {p.commentCount} comments</span>
              </div>
              <button className="btn-danger btn-sm" onClick={() => deletePost(p)}>Delete</button>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-slate-500">Admins can also delete any post or comment directly from its page.</p>
      </section>

      <section aria-label="Users">
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold">Users</h2>
          <input type="search" className="input sm:w-64" placeholder="Search username or email…" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search users" />
        </div>
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[32rem] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-2">User</th>
                <th className="px-4 py-2">Role</th>
                <th className="px-4 py-2">Joined</th>
                <th className="px-4 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {usersLoading ? (
                <tr><td colSpan={4}><Spinner className="py-6" /></td></tr>
              ) : users.users.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-6 text-center text-slate-500">No users found.</td></tr>
              ) : (
                users.users.map((u) => (
                  <tr key={u.id}>
                    <td className="px-4 py-2.5">
                      <Link to={`/users/${u.username}`} className="font-medium hover:text-indigo-600">{u.username}</Link>
                      {u.isBanned && <span className="ml-2 rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-red-700">Banned</span>}
                      <div className="text-xs text-slate-500">{u.email}</div>
                    </td>
                    <td className="px-4 py-2.5 capitalize">{u.role}</td>
                    <td className="px-4 py-2.5 text-slate-500">{formatDate(u.createdAt)}</td>
                    <td className="px-4 py-2.5 text-right">
                      {u.role !== 'admin' && (
                        <button className={u.isBanned ? 'btn-secondary btn-sm' : 'btn-danger btn-sm'} onClick={() => toggleBan(u)}>
                          {u.isBanned ? 'Unban' : 'Ban'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="mt-4">
          <Pagination page={users.pagination.page} pages={users.pagination.pages} onChange={setPage} />
        </div>
      </section>
    </div>
  );
}
