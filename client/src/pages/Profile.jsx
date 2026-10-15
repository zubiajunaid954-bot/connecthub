import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { usersApi, errorMessage } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Avatar from '../components/Avatar';
import PostCard from '../components/PostCard';
import Pagination from '../components/Pagination';
import Spinner from '../components/Spinner';
import ErrorMessage from '../components/ErrorMessage';
import EmptyState from '../components/EmptyState';
import { excerpt, formatDate, timeAgo } from '../utils/format';

const TABS = ['posts', 'comments', 'activity'];

export default function Profile() {
  const { username } = useParams();
  const { user: me, setUser } = useAuth();
  const toast = useToast();

  const [profile, setProfile] = useState(null);
  const [tab, setTab] = useState('posts');
  const [page, setPage] = useState(1);
  const [content, setContent] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingTab, setLoadingTab] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [bio, setBio] = useState('');

  const isMe = me?.username === username;

  useEffect(() => {
    let ignore = false;
    setLoadingProfile(true);
    setError('');
    setTab('posts');
    setPage(1);
    usersApi
      .profile(username)
      .then((d) => !ignore && setProfile(d))
      .catch((err) => !ignore && setError(err.response?.status === 404 ? 'User not found.' : errorMessage(err)))
      .finally(() => !ignore && setLoadingProfile(false));
    return () => {
      ignore = true;
    };
  }, [username]);

  const loadTab = useCallback(() => {
    let ignore = false;
    setLoadingTab(true);
    const request =
      tab === 'posts' ? usersApi.posts(username, { page, limit: 8 }) : tab === 'comments' ? usersApi.comments(username, { page, limit: 10 }) : usersApi.activity(username);
    request
      .then((d) => !ignore && setContent(d))
      .catch((err) => !ignore && setError(errorMessage(err)))
      .finally(() => !ignore && setLoadingTab(false));
    return () => {
      ignore = true;
    };
  }, [tab, page, username, me?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (error === 'User not found.') return undefined;
    return loadTab();
  }, [loadTab]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveBio = async (e) => {
    e.preventDefault();
    try {
      const { user } = await usersApi.updateBio(bio);
      setProfile((p) => ({ ...p, user: { ...p.user, bio: user.bio } }));
      setUser((u) => ({ ...u, bio: user.bio }));
      setEditing(false);
      toast('Profile updated', 'success');
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  };

  if (loadingProfile) return <Spinner label="Loading profile…" />;
  if (!profile) return <ErrorMessage message={error || 'Could not load profile.'} />;

  const { user, stats } = profile;
  const pagination = content?.pagination;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <section className="card p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <Avatar name={user.username} size="lg" />
          <div className="min-w-0 flex-1">
            <h1 className="flex flex-wrap items-center gap-2 text-2xl font-bold">
              {user.username}
              {user.role === 'admin' && <span className="rounded bg-indigo-100 px-2 py-0.5 text-xs font-semibold uppercase text-indigo-700">Admin</span>}
              {user.isBanned && <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-semibold uppercase text-red-700">Banned</span>}
            </h1>
            <p className="text-sm text-slate-500">Joined {formatDate(user.createdAt)}</p>
          </div>
          {isMe && !editing && (
            <button className="btn-secondary btn-sm self-start" onClick={() => { setBio(user.bio); setEditing(true); }}>
              Edit bio
            </button>
          )}
        </div>

        {editing ? (
          <form onSubmit={saveBio} className="mt-4 space-y-2">
            <textarea className="input" maxLength={280} rows={3} value={bio} onChange={(e) => setBio(e.target.value)} aria-label="Bio" />
            <div className="flex justify-end gap-2">
              <button type="button" className="btn-secondary btn-sm" onClick={() => setEditing(false)}>Cancel</button>
              <button className="btn-primary btn-sm">Save</button>
            </div>
          </form>
        ) : (
          <p className="mt-4 text-sm text-slate-700">{user.bio || (isMe ? 'Add a short bio so people know who you are.' : 'No bio yet.')}</p>
        )}

        <dl className="mt-5 grid grid-cols-3 gap-3 text-center">
          {[['Posts', stats.posts], ['Comments', stats.comments], ['Karma', stats.karma]].map(([label, value]) => (
            <div key={label} className="rounded-lg bg-slate-50 py-3">
              <dd className="text-xl font-bold text-slate-900">{value}</dd>
              <dt className="text-xs text-slate-500">{label}</dt>
            </div>
          ))}
        </dl>
      </section>

      <div className="flex gap-1 border-b border-slate-200" role="tablist">
        {TABS.map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => { setTab(t); setPage(1); setContent(null); }}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium capitalize ${tab === t ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
          >
            {t}
          </button>
        ))}
      </div>

      <ErrorMessage message={error} onRetry={loadTab} />

      {loadingTab || !content ? (
        <Spinner label="Loading…" className="py-10" />
      ) : tab === 'posts' ? (
        content.posts?.length ? (
          <div className="space-y-3">{content.posts.map((p) => <PostCard key={p.id} post={p} />)}</div>
        ) : (
          <EmptyState title="No posts yet" description={isMe ? 'Share something with the community.' : undefined} action={isMe && <Link to="/posts/new" className="btn-primary">Create a post</Link>} />
        )
      ) : tab === 'comments' ? (
        content.comments?.length ? (
          <ul className="space-y-3">
            {content.comments.map((c) => (
              <li key={c.id} className="card p-4 text-sm">
                <p className="mb-1 text-xs text-slate-500">
                  on <Link to={`/posts/${c.post.id}`} className="font-medium text-indigo-600 hover:underline">{c.post.title ?? 'a post'}</Link> · {timeAgo(c.createdAt)}
                </p>
                <p className="whitespace-pre-wrap break-words text-slate-700">{c.body}</p>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="No comments yet" />
        )
      ) : content.activity?.length ? (
        <ul className="card divide-y divide-slate-100">
          {content.activity.map((a) => (
            <li key={`${a.type}-${a.id}`} className="px-4 py-3 text-sm">
              <span className="text-slate-500">{a.type === 'post' ? 'Posted' : 'Commented on'}</span>{' '}
              {a.post && <Link to={`/posts/${a.post.id}`} className="font-medium text-indigo-600 hover:underline">{a.post.title}</Link>}
              <span className="text-xs text-slate-400"> · {timeAgo(a.createdAt)}</span>
              {a.excerpt && <p className="mt-0.5 text-slate-600">“{excerpt(a.excerpt, 140)}”</p>}
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title="No activity yet" />
      )}

      {pagination && tab !== 'activity' && <Pagination page={pagination.page} pages={pagination.pages} onChange={setPage} />}
    </div>
  );
}
