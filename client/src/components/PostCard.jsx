import { Link } from 'react-router-dom';
import VoteButtons from './VoteButtons';
import CategoryBadge from './CategoryBadge';
import Avatar from './Avatar';
import { excerpt, timeAgo } from '../utils/format';

export default function PostCard({ post }) {
  return (
    <article className="card flex gap-3 p-4 transition hover:border-indigo-200 hover:shadow-md sm:gap-4">
      <VoteButtons postId={post.id} score={post.score} userVote={post.userVote} />
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <CategoryBadge slug={post.category} />
          {post.tags.map((t) => (
            <Link key={t} to={`/?tag=${encodeURIComponent(t)}`} className="text-xs text-slate-500 hover:text-indigo-600">
              #{t}
            </Link>
          ))}
        </div>
        <h2 className="text-lg font-semibold leading-snug text-slate-900">
          <Link to={`/posts/${post.id}`} className="hover:text-indigo-600">
            {post.title}
          </Link>
        </h2>
        <p className="mt-1 break-words text-sm text-slate-600">{excerpt(post.body)}</p>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
          <Link to={`/users/${post.author.username}`} className="flex items-center gap-1.5 font-medium text-slate-700 hover:text-indigo-600">
            <Avatar name={post.author.username} size="sm" />
            {post.author.username}
          </Link>
          <span>{timeAgo(post.createdAt)}</span>
          <Link to={`/posts/${post.id}`} className="hover:text-indigo-600">
            💬 {post.commentCount} {post.commentCount === 1 ? 'comment' : 'comments'}
          </Link>
        </div>
      </div>
    </article>
  );
}
