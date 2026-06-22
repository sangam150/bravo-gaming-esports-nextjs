export default function GlobalLoading() {
  return (
    <main className="page-shell pb-12 pt-6">
      <div className="page-stack">
        <section className="hero-banner overflow-hidden p-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_14%_18%,_rgba(29,155,240,0.18),_transparent_30%),radial-gradient(circle_at_84%_18%,_rgba(0,230,118,0.14),_transparent_30%),linear-gradient(135deg,rgba(8,15,30,0.98),rgba(8,15,30,0.82))]" />
          <div className="relative z-10">
            <span className="brand-badge">Loading</span>
            <h1 className="hero-h1 mt-5">Loading latest standings...</h1>
            <p className="mt-4 max-w-3xl text-sm leading-relaxed text-text-muted">
              Preparing match statistics, tournament information, and published Bravo updates.
            </p>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="esports-card p-6">
              <div className="h-3 w-24 animate-pulse rounded-full bg-white/10" />
              <div className="mt-4 h-8 w-3/4 animate-pulse rounded-full bg-white/10" />
              <div className="mt-6 space-y-3">
                <div className="h-4 w-full animate-pulse rounded-full bg-white/10" />
                <div className="h-4 w-5/6 animate-pulse rounded-full bg-white/10" />
                <div className="h-4 w-2/3 animate-pulse rounded-full bg-white/10" />
              </div>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
