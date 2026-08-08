export function TimelineSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="در حال بارگذاری">
      <div className="h-24 animate-pulse rounded-2xl bg-white/5" />
      <div className="h-40 animate-pulse rounded-2xl bg-white/5" />
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-48 animate-pulse rounded-2xl bg-white/5" />
      ))}
    </div>
  );
}

export function EmptyTimelineState({
  title = "داده‌ای برای نمایش نیست",
  description = "با تغییر فیلترها یا بازه تاریخ دوباره تلاش کنید.",
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--panel)] px-6 py-16 text-center">
      <h3 className="text-lg font-semibold text-white">{title}</h3>
      <p className="mt-2 text-sm text-slate-400">{description}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 rounded-xl bg-blue-600 px-4 py-2 text-sm text-white"
        >
          تلاش مجدد
        </button>
      ) : null}
    </div>
  );
}
