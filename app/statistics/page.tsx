import Link from "next/link";

export default function StatisticsPage() {
  return (
    <main className="mx-auto max-w-7xl px-6 py-10 sm:px-8 lg:py-14">
      <section className="glass-panel p-8">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="section-title">Esports</p>
            <h1 className="mt-4 text-4xl font-black tracking-[-0.04em] text-white sm:text-5xl">Statistics</h1>
            <p className="mt-5 max-w-3xl text-slate-300">Track team performance, player metrics, and tournament analytics from the Bravo competitive platform.</p>
          </div>
          <Link href="/" className="rounded-full bg-bravoBlue px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-white/90">
            Back to Home
          </Link>
        </div>
        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <div className="rounded-[28px] border border-white/10 bg-slate-950/80 p-6">
            <p className="text-lg font-semibold text-white">Competitive scoring</p>
            <p className="mt-3 text-slate-300">Get access to the latest scoring metrics, kill counts, placement stats and ranking insights.</p>
          </div>
          <div className="rounded-[28px] border border-white/10 bg-slate-950/80 p-6">
            <p className="text-lg font-semibold text-white">Performance at a glance</p>
            <ul className="mt-4 space-y-3 text-slate-300">
              <li>• Team win/loss ratios.</li>
              <li>• MVP impact metrics.</li>
              <li>• Event leaderboard snapshots.</li>
            </ul>
          </div>
        </div>
      </section>
    </main>
  );
}
