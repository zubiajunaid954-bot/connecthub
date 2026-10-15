import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { postsApi, errorMessage } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import VoteButtons from '../components/VoteButtons';
import CategoryBadge from '../components/CategoryBadge';
import CommentSection from '../components/CommentSection';
import Avatar from '../components/Avatar';
import Spinner from '../components/Spinner';
import ErrorMessage from '../components/ErrorMessage';
import { formatDate, timeAgo } from '../utils/format';

export default function PostDetail() {
  const { id } = useParams();
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    let ignore = false;
    setLoading(true);
    setError('');
    postsApi
      .get(id)
      .then((d) => !ignore && setPost(d.post))
      .catch((err) => !ignore && setError(err.response?.status === 404 ? 'This post does not exist or was deleted.' : errorMessage(err)))
      .finally(() => !ignore && setLoading(false));
    return () => {
      ignore = true;
    };
  }, [id, user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => load(), [load]);

  const remove = async () => {
    if (!window.confirm('Delete this post and all its comments? This cannot be undone.')) return;
    try {
      await postsApi.remove(post.id);
      toast('Post deleted', 'success');
      navigate('/');
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  };

  if (loading) return <Spinner label="Loading post…" />;
  if (error)
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <ErrorMessage message={error} onRetry={load} />
        <Link to="/" className="btn-secondary">← Back to forum</Link>
      </div>
    );

  const canManage = user && (user.id === post.author.id || isAdmin);

  return (
    <div className="mx-auto max-w-3xl">
      <Link to="/" className="mb-4 inline-block text-sm text-slate-500 hover:text-indigo-600">
        ← Back to forum
      </Link>

      <article className="card flex gap-4 p-5">
        <VoteButtons postId={post.id} score={post.score} userVote={post.userVote} />
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <CategoryBadge slug={post.category} />
            {post.tags.map((t) => (
              <Link key={t} to={`/?tag=${encodeURIComponent(t)}`} className="text-xs text-slate-500 hover:text-indigo-600">
                #{t}
              </Link>
            ))}
          </div>
          <h1 className="break-words text-2xl font-bold text-slate-900">{post.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-500">
            <Link to={`/users/${post.author.username}`} className="flex items-center gap-2 font-medium text-slate-700 hover:text-indigo-600">
              <Avatar name={post.author.username} size="sm" />
              {post.author.username}
            </Link>
            <span title={formatDate(post.createdAt)}>{timeAgo(post.createdAt)}</span>
            {post.updatedAt !== post.createdAt && <span className="text-xs">(edited)</span>}
          </div>
          <div className="mt-5 whitespace-pre-wrap break-words text-slate-800">{post.body}</div>

          {canManage && (
            <div className="mt-6 flex gap-2 border-t border-slate-100 pt-4">
              <Link to={`/posts/${post.id}/edit`} className="btn-secondary btn-sm">
                Edit
              </Link>
              <button onClick={remove} className="btn-danger btn-sm">
                Delete{isAdmin && user.id !== post.author.id ? ' (admin)' : ''}
              </button>
            </div>
          )}
        </div>
      </article>

      <CommentSection postId={post.id} onCountChange={(d) => setPost((p) => ({ ...p, commentCount: p.commentCount + d }))} />
    </div>
  );
}
