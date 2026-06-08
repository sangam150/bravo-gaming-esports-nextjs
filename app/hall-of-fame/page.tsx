import Link from "next/link";

const champions = [
  { team: "Bravo Elite", season: "Season 4" },
  { team: "Dead Eyes", season: "Season 3" },
  { team: "Ruthless", season: "Season 2" },
];

export default function HallOfFamePage() {
  return (
    <main className="mx-auto max-w-7xl px-6 py-10 sm:px-8 lg:py-14">
      <section className="glass-panel p-8">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="section-title">Hall of Fame</p>
            <h1 className="mt-4 text-4xl font-black tracking-[-0.04em] text-white sm:text-5xl">Bravo Champions</h1>
            <p className="mt-5 max-w-2xl text-slate-300">Honoring the best teams and players who dominated the Bravo Gaming season.</p>
          </div>
          <Link href="/tournaments" className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:border-bravoBlue">
            Tournament History
          </Link>
        </div>

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {champions.map((champion) => (
            <div key={champion.team} className="rounded-[28px] border border-white/10 bg-slate-950/80 p-6">
              <p className="text-slate-400">{champion.season}</p>
              <h2 className="mt-4 text-2xl font-semibold text-white">{champion.team}</h2>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
