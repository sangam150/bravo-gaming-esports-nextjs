const topMvps = [
  { player: "ShadowNJP", team: "Bravo Elite", points: 95 },
  { player: "GhostFalcon", team: "Ruthless", points: 88 },
  { player: "TigerK9", team: "Dead Eyes", points: 82 },
];

export default function MvpRankingPage() {
  return (
    <main className="mx-auto max-w-7xl px-6 py-10 sm:px-8 lg:py-14">
      <section className="glass-panel p-8">
        <div className="mb-8">
          <p className="section-title">MVP Ranking</p>
          <h1 className="mt-4 text-4xl font-black tracking-[-0.04em] text-white sm:text-5xl">Top Performers</h1>
          <p className="mt-5 max-w-2xl text-slate-300">MVP leaderboard for the season, tracking kills, wins and standout PUBG PC performers.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {topMvps.map((mvp) => (
            <div key={mvp.player} className="rounded-[28px] border border-white/10 bg-slate-950/80 p-6">
              <p className="text-2xl font-black text-bravoBlue">{mvp.points}</p>
              <h2 className="mt-4 text-xl font-semibold text-white">{mvp.player}</h2>
              <p className="mt-2 text-slate-300">{mvp.team}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
