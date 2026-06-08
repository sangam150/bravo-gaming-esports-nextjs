import Link from "next/link";

const rpFeatures = [
  "Live roleplay streams",
  "Gorkhali RP story arcs",
  "Community missions",
  "Cops vs crew events",
];

export default function GtaRpPage() {
  return (
    <main className="mx-auto max-w-7xl px-6 py-10 sm:px-8 lg:py-14">
      <section className="glass-panel p-8">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="section-title">GTA V / Gorkhali RP</p>
            <h1 className="mt-4 text-4xl font-black tracking-[-0.04em] text-white sm:text-5xl">Roleplay Content with Nepali Energy</h1>
            <p className="mt-5 max-w-2xl text-slate-300">Stream roleplay campaigns, character dramas and action-packed GTA V RP sessions with a uniquely Nepali twist.</p>
          </div>
          <Link href="/videos" className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:border-bravoGreen">
            Watch Highlights
          </Link>
        </div>

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {rpFeatures.map((feature) => (
            <div key={feature} className="rounded-[28px] border border-white/10 bg-slate-950/80 p-6">
              <p className="text-lg font-semibold text-white">{feature}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
