import Link from "next/link";

export default function ResultsPage() {
  return (
    <main className="mx-auto max-w-7xl px-6 py-10 sm:px-8 lg:py-14">
      <section className="glass-panel p-8">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="section-title">Results</p>
            <h1 className="mt-4 text-4xl font-black tracking-[-0.04em] text-white sm:text-5xl">Official match results</h1>
            <p className="mt-5 max-w-3xl text-slate-300">Browse verified PUBG PC scrim outcomes, tournament rankings, and end-of-day standings from the Bravo esports network.</p>
          </div>
          <Link href="/" className="rounded-full bg-bravoBlue px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-white/90">
            Back to Home
          </Link>
        </div>
        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <div className="rounded-[28px] border border-white/10 bg-slate-950/80 p-6">
            <p className="text-lg font-semibold text-white">Verified standings</p>
            <p className="mt-3 text-slate-300">All match results are validated by admin review, so teams and fans can trust the leaderboard and tournament scoreboards.</p>
          </div>
          <div className="rounded-[28px] border border-white/10 bg-slate-950/80 p-6">
            <p className="text-lg font-semibold text-white">What you get</p>
            <ul className="mt-4 space-y-3 text-slate-300">
              <li>• Official tournament winners and prize reports.</li>
              <li>• Match-by-match performance summaries.</li>
              <li>• Accurate team and player placement history.</li>
            </ul>
          </div>
        </div>
      </section>
    </main>
  );
}
