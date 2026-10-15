import { Link } from 'react-router-dom';
import { categoryOf } from '../constants';

export default function CategoryBadge({ slug, linked = true }) {
  const c = categoryOf(slug);
  const cls = `inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${c.color}`;
  return linked ? (
    <Link to={`/?category=${c.slug}`} className={`${cls} hover:opacity-80`}>
      {c.label}
    </Link>
  ) : (
    <span className={cls}>{c.label}</span>
  );
}
