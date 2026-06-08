export default function SponsorsPage() {
  return (
    <main className="mx-auto max-w-7xl px-6 py-10 sm:px-8 lg:py-14">
      <section className="glass-panel p-8">
        <div className="mb-8">
          <p className="section-title">Sponsors & Partners</p>
          <h1 className="mt-4 text-4xl font-black tracking-[-0.04em] text-white sm:text-5xl">Brand Allies</h1>
          <p className="mt-5 max-w-2xl text-slate-300">Explore the partner network powering Bravo Gaming Esports, from hardware sponsors to broadcast and community backers.</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { name: 'Bravo Tech', tier: 'Title Sponsor' },
              { name: 'Rising Fuel', tier: 'Official Energy' },
              { name: 'Nepal Gaming', tier: 'Community Partner' },
              { name: 'LiveStream Pro', tier: 'Broadcast Partner' },
            ].map((sponsor) => (
              <div key={sponsor.name} className="rounded-[28px] border border-white/10 bg-slate-950/80 p-6">
                <p className="text-lg font-semibold text-white">{sponsor.name}</p>
                <p className="mt-2 text-slate-400">{sponsor.tier}</p>
              </div>
            ))}
          </div>

          <div className="rounded-[28px] border border-white/10 bg-slate-950/80 p-8">
            <p className="text-sm uppercase tracking-[0.24em] text-bravoBlue">Partner advantages</p>
            <h2 className="mt-4 text-3xl font-semibold text-white">Get brand exposure in every event</h2>
            <p className="mt-4 text-slate-300">Sponsors receive prime placement across streams, tournament overlays, team branding, and social content for the Nepali esports audience.</p>
            <ul className="mt-6 space-y-3 text-slate-300">
              <li>• Tournament title branding and live stream integration.</li>
              <li>• Sponsor highlights in match recaps and leaderboards.</li>
              <li>• Dedicated campaigns for community growth and event activation.</li>
            </ul>
            <a href="/contact" className="mt-8 inline-flex rounded-full bg-bravoBlue px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-white/90">
              Partner with Bravo
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
