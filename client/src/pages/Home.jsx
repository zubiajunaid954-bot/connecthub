import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { postsApi, errorMessage } from '../api';
import { CATEGORIES, SORT_OPTIONS } from '../constants';
import { useAuth } from '../context/AuthContext';
import useDebounce from '../hooks/useDebounce';
import PostCard from '../components/PostCard';
import Pagination from '../components/Pagination';
import Spinner from '../components/Spinner';
import ErrorMessage from '../components/ErrorMessage';
import EmptyState from '../components/EmptyState';
import OnlineUsers from '../components/OnlineUsers';

const LIMIT = 10;

export default function Home() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const page = Math.max(1, Number(params.get('page')) || 1);
  const search = params.get('search') || '';
  const category = params.get('category') || '';
  const tag = params.get('tag') || '';
  const sort = params.get('sort') || '';

  const [searchInput, setSearchInput] = useState(search);
  const debouncedSearch = useDebounce(searchInput, 400);
  const [data, setData] = useState({ posts: [], pagination: { page: 1, pages: 1, total: 0 } });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // URL is the single source of truth for filters, so views are shareable and the back button works.
  const updateParams = useCallback(
    (patch) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
          if (!('page' in patch)) next.delete('page');
          return next;
        },
        { replace: true }
      );
    },
    [setParams]
  );

  useEffect(() => {
    if (debouncedSearch !== search) updateParams({ search: debouncedSearch });
  }, [debouncedSearch]); // eslint-disable-line react-hooks/exhaustive-deps

  const load = useCallback(() => {
    let ignore = false;
    setLoading(true);
    setError('');
    postsApi
      .list({ page, limit: LIMIT, search: search || undefined, category: category || undefined, tag: tag || undefined, sort: sort || undefined })
      .then((d) => !ignore && setData(d))
      .catch((err) => !ignore && setError(errorMessage(err)))
      .finally(() => !ignore && setLoading(false));
    return () => {
      ignore = true;
    };
  }, [page, search, category, tag, sort, user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => load(), [load]);

  const hasFilters = search || category || tag || sort;
  const clearFilters = () => {
    setSearchInput('');
    setParams({}, { replace: true });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_18rem]">
      <div className="min-w-0 space-y-4">
        <div className="card flex flex-col gap-3 p-3 sm:flex-row">
          <input
            type="search"
            className="input"
            placeholder="Search posts…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            aria-label="Search posts"
          />
          <select className="input sm:w-48" value={sort || (search ? 'relevance' : 'new')} onChange={(e) => updateParams({ sort: e.target.value })} aria-label="Sort posts">
            {search && <option value="relevance">Best match</option>}
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => updateParams({ category: '' })} className={`rounded-full px-3 py-1 text-sm ${!category ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'}`}>
            All
          </button>
          {CATEGORIES.map((c) => (
            <button
              key={c.slug}
              onClick={() => updateParams({ category: c.slug })}
              className={`rounded-full px-3 py-1 text-sm ${category === c.slug ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'}`}
            >
              {c.label}
            </button>
          ))}
          {tag && (
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-800 px-3 py-1 text-sm text-white">
              #{tag}
              <button onClick={() => updateParams({ tag: '' })} aria-label="Remove tag filter">
                ✕
              </button>
            </span>
          )}
        </div>

        <ErrorMessage message={error} onRetry={load} />

        {loading ? (
          <Spinner label="Loading posts…" />
        ) : data.posts.length === 0 && !error ? (
          <EmptyState
            title="No posts found"
            description={hasFilters ? 'Try different keywords or clear your filters.' : 'Be the first to start a conversation.'}
            action={
              hasFilters ? (
                <button className="btn-secondary" onClick={clearFilters}>
                  Clear filters
                </button>
              ) : (
                <Link to="/posts/new" className="btn-primary">
                  Create a post
                </Link>
              )
            }
          />
        ) : (
          <div className="space-y-3">
            {data.posts.map((p) => (
              <PostCard key={p.id} post={p} />
            ))}
          </div>
        )}

        {!loading && (
          <>
            <p className="text-center text-xs text-slate-500">{data.pagination.total} posts</p>
            <Pagination page={data.pagination.page} pages={data.pagination.pages} onChange={(p) => { updateParams({ page: String(p) }); window.scrollTo({ top: 0, behavior: 'smooth' }); }} />
          </>
        )}
      </div>

      <aside className="space-y-4">
        <div className="card p-4">
          <p className="mb-3 text-sm text-slate-600">Ask questions, share projects, and chat live with the community.</p>
          <Link to={user ? '/posts/new' : '/register'} className="btn-primary w-full">
            {user ? 'Create a post' : 'Join ConnectHub'}
          </Link>
        </div>
        {user && (
          <div className="card p-4">
            <h3 className="mb-2 text-sm font-semibold">Live chat rooms</h3>
            <ul className="space-y-1 text-sm">
              {CATEGORIES.map((c) => (
                <li key={c.slug}>
                  <Link to={`/chat/${c.slug}`} className="text-slate-600 hover:text-indigo-600">
                    # {c.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
        <OnlineUsers />
      </aside>
    </div>
  );
}
