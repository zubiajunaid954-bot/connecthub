import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { postsApi, errorMessage } from '../api';
import { CATEGORIES } from '../constants';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Spinner from '../components/Spinner';
import ErrorMessage from '../components/ErrorMessage';

const parseTags = (text) => [...new Set(text.split(',').map((t) => t.trim().toLowerCase().replace(/^#/, '')).filter(Boolean))];

// One form for both "create" (/posts/new) and "edit" (/posts/:id/edit).
export default function PostForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [form, setForm] = useState({ title: '', category: 'general', tags: '', body: '' });
  const [loading, setLoading] = useState(isEdit);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isEdit) return undefined;
    let ignore = false;
    postsApi
      .get(id)
      .then(({ post }) => {
        if (ignore) return;
        if (post.author.id !== user.id && !isAdmin) {
          navigate(`/posts/${id}`, { replace: true });
          return;
        }
        setForm({ title: post.title, category: post.category, tags: post.tags.join(', '), body: post.body });
      })
      .catch((err) => !ignore && setError(errorMessage(err)))
      .finally(() => !ignore && setLoading(false));
    return () => {
      ignore = true;
    };
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    const payload = { title: form.title, category: form.category, body: form.body, tags: parseTags(form.tags) };
    try {
      const { post } = isEdit ? await postsApi.update(id, payload) : await postsApi.create(payload);
      toast(isEdit ? 'Post updated' : 'Post published', 'success');
      navigate(`/posts/${post.id}`);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Spinner label="Loading post…" />;

  return (
    <div className="mx-auto max-w-3xl">
      <form onSubmit={submit} className="card space-y-5 p-6">
        <h1 className="text-2xl font-bold">{isEdit ? 'Edit post' : 'Create a post'}</h1>
        <ErrorMessage message={error} />

        <div>
          <label htmlFor="title" className="label">Title</label>
          <input id="title" required minLength={3} maxLength={150} className="input" value={form.title} onChange={set('title')} placeholder="What's on your mind?" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="category" className="label">Category</label>
            <select id="category" className="input" value={form.category} onChange={set('category')}>
              {CATEGORIES.map((c) => (
                <option key={c.slug} value={c.slug}>{c.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="tags" className="label">Tags</label>
            <input id="tags" className="input" value={form.tags} onChange={set('tags')} placeholder="hooks, performance (max 5)" />
          </div>
        </div>

        <div>
          <label htmlFor="body" className="label">Body</label>
          <textarea id="body" required maxLength={10000} className="input min-h-56" value={form.body} onChange={set('body')} placeholder="Share the details…" />
          <p className="mt-1 text-right text-xs text-slate-400">{form.body.length}/10000</p>
        </div>

        <div className="flex justify-end gap-2">
          <Link to={isEdit ? `/posts/${id}` : '/'} className="btn-secondary">Cancel</Link>
          <button className="btn-primary" disabled={submitting}>
            {submitting ? 'Saving…' : isEdit ? 'Save changes' : 'Publish'}
          </button>
        </div>
      </form>
    </div>
  );
}
