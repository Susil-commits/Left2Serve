export default function StarRating({ value = 0, size = 'md', showValue = false, count }) {
  const sizeCls = size === 'sm' ? 'w-3.5 h-3.5' : size === 'lg' ? 'w-7 h-7' : 'w-5 h-5';
  const textCls = size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-base' : 'text-sm';
  const stars = [1, 2, 3, 4, 5];
  return (
    <div className="flex items-center gap-1">
      <div className="flex items-center gap-0.5">
        {stars.map((s) => (
          <svg key={s} className={`${sizeCls} ${s <= Math.round(value) ? 'text-amber-400' : 'text-gray-300'}`} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
          </svg>
        ))}
      </div>
      {showValue && <span className={`${textCls} font-semibold text-text`}>{Number(value).toFixed(1)}</span>}
      {count != null && <span className={`${textCls} text-muted`}>({count})</span>}
    </div>
  );
}
