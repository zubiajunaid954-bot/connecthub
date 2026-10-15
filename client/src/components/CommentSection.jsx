import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { commentsApi, errorMessage } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Avatar from './Avatar';
import ErrorMessage from './ErrorMessage';
import Spinner from './Spinner';
import { timeAgo } from '../utils/format';

const PAGE_SIZE = 20;

export default function CommentSection({ postId, onCountChange }) {
  const { user, isAdmin } = useAuth();
  const toast = useToast();
  const [comments, setComments] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(
    async (page = 1) => {
      setLoading(true);
      setError('');
      try {
        const d = await commentsApi.list(postId, { page, limit: PAGE_SIZE });
        setComments((prev) => (page === 1 ? d.comments : [...prev, ...d.comments]));
        setPagination(d.pagination);
      } catch (err) {
        setError(errorMessage(err));
      } finally {
        setLoading(false);
      }
    },
    [postId]
  );

  useEffect(() => {
    load(1);
  }, [load]);

  const submit = async (e) => {
    e.preventDefault();
    if (!body.trim()) return;
    setSubmitting(true);
    try {
      const d = await commentsApi.create(postId, body.trim());
      setComments((prev) => [...prev, d.comment]);
      setPagination((p) => ({ ...p, total: p.total + 1 }));
      onCountChange?.(1);
      setBody('');
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this comment?')) return;
    try {
      await commentsApi.remove(id);
      setComments((prev) => prev.filter((c) => c.id !== id));
      setPagination((p) => ({ ...p, total: Math.max(0, p.total - 1) }));
      onCountChange?.(-1);
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  };

  return (
    <section className="mt-8">
      <h2 className="mb-4 text-lg font-semibold">
        Comments <span className="text-slate-500">({pagination.total})</span>
      </h2>

      {user ? (
        <form onSubmit={submit} className="card mb-6 p-4">
          <label htmlFor="comment" className="label">
            Add a comment
          </label>
          <textarea id="comment" className="input min-h-24" maxLength={2000} placeholder="Share your thoughts…" value={body} onChange={(e) => setBody(e.target.value)} />
          <div className="mt-2 flex items-center justify-between">
            <span className="text-xs text-slate-400">{body.length}/2000</span>
            <button className="btn-primary" disabled={submitting || !body.trim()}>
              {submitting ? 'Posting…' : 'Comment'}
            </button>
          </div>
        </form>
      ) : (
        <p className="card mb-6 p-4 text-sm text-slate-600">
          <Link to="/login" className="font-medium text-indigo-600 hover:underline">
            Log in
          </Link>{' '}
          to join the discussion.
        </p>
      )}

      <ErrorMessage message={error} onRetry={() => load(1)} />

      <ul className="space-y-3">
        {comments.map((c) => (
          <li key={c.id} className="card p-4">
            <div className="mb-2 flex items-center gap-2 text-xs text-slate-500">
              <Avatar name={c.author.username} size="sm" />
              <Link to={`/users/${c.author.username}`} className="text-sm font-medium text-slate-800 hover:text-indigo-600">
                {c.author.username}
              </Link>
              {c.author.role === 'admin' && <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-indigo-700">Admin</span>}
              <span>· {timeAgo(c.createdAt)}</span>
              {user && (user.id === c.author.id || isAdmin) && (
                <button onClick={() => remove(c.id)} className="ml-auto text-slate-400 hover:text-red-600">
                  Delete
                </button>
              )}
            </div>
            <p className="whitespace-pre-wrap break-words text-sm text-slate-700">{c.body}</p>
          </li>
        ))}
      </ul>

      {loading && <Spinner className="py-6" />}
      {!loading && !error && comments.length === 0 && <p className="py-6 text-center text-sm text-slate-500">No comments yet. Be the first!</p>}
      {!loading && pagination.page < pagination.pages && (
        <div className="mt-4 text-center">
          <button className="btn-secondary" onClick={() => load(pagination.page + 1)}>
            Load more comments
          </button>
        </div>
      )}
    </section>
  );
}
