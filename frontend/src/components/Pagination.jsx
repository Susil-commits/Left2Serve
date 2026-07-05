export default function Pagination({ page, pageCount, onChange }) {
  if (pageCount <= 1) return null;

  const pages = [];
  const add = (p, label = String(p), disabled = false) => pages.push({ p, label, disabled });

  add(1);
  if (page > 3) add(null, '…', true);
  for (let p = Math.max(2, page - 1); p <= Math.min(pageCount - 1, page + 1); p++) add(p);
  if (page < pageCount - 2) add(null, '…', true);
  if (pageCount > 1) add(pageCount);

  return (
    <nav className="flex items-center justify-center gap-1.5 mt-10" aria-label="Pagination">
      <button onClick={() => onChange(page - 1)} disabled={page <= 1} aria-label="Previous page"
        className="w-10 h-10 rounded-xl flex items-center justify-center border border-border text-subtle hover:bg-accent/5 hover:text-accent hover:border-accent/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-subtle disabled:hover:border-border">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
      </button>
      {pages.map((pg, i) =>
        pg.disabled ? (
          <span key={`e${i}`} className="w-10 h-10 flex items-center justify-center text-muted text-sm">…</span>
        ) : (
          <button key={pg.p} onClick={() => onChange(pg.p)} aria-current={pg.p === page ? 'page' : undefined}
            className={`min-w-10 h-10 px-2 rounded-xl flex items-center justify-center text-sm font-semibold transition-all ${
              pg.p === page ? 'bg-accent text-white shadow-red' : 'border border-border text-subtle hover:bg-accent/5 hover:text-accent hover:border-accent/20'
            }`}>{pg.label}</button>
        )
      )}
      <button onClick={() => onChange(page + 1)} disabled={page >= pageCount} aria-label="Next page"
        className="w-10 h-10 rounded-xl flex items-center justify-center border border-border text-subtle hover:bg-accent/5 hover:text-accent hover:border-accent/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-subtle disabled:hover:border-border">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
      </button>
    </nav>
  );
}
