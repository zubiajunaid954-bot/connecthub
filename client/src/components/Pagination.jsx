export default function Pagination({ page, pages, onChange }) {
  if (pages <= 1) return null;

  // Show first, last, and a window around the current page.
  const visible = [...new Set([1, pages, page - 1, page, page + 1])].filter((p) => p >= 1 && p <= pages).sort((a, b) => a - b);

  return (
    <nav className="flex items-center justify-center gap-1" aria-label="Pagination">
      <button className="btn-secondary btn-sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        ← Prev
      </button>
      {visible.map((p, i) => (
        <span key={p} className="flex items-center gap-1">
          {i > 0 && p - visible[i - 1] > 1 && <span className="px-1 text-slate-400">…</span>}
          <button
            onClick={() => onChange(p)}
            aria-current={p === page ? 'page' : undefined}
            className={`btn btn-sm ${p === page ? 'bg-indigo-600 text-white' : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}`}
          >
            {p}
          </button>
        </span>
      ))}
      <button className="btn-secondary btn-sm" disabled={page >= pages} onClick={() => onChange(page + 1)}>
        Next →
      </button>
    </nav>
  );
}
