import Link from "next/link";

export default function PartnersPage() {
  return (
    <main className="mx-auto max-w-7xl px-6 py-10 sm:px-8 lg:py-14">
      <section className="glass-panel p-8">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="section-title">About</p>
            <h1 className="mt-4 text-4xl font-black tracking-[-0.04em] text-white sm:text-5xl">Partners</h1>
            <p className="mt-5 max-w-3xl text-slate-300">Meet the brands supporting Bravo Gaming Esports and powering our tournaments, streams, and community rewards.</p>
          </div>
          <Link href="/" className="rounded-full bg-bravoBlue px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-white/90">
            Back to Home
          </Link>
        </div>
        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <div className="rounded-[28px] border border-white/10 bg-slate-950/80 p-6">
            <p className="text-lg font-semibold text-white">Brand ecosystem</p>
            <p className="mt-3 text-slate-300">See the companies and community partners that help deliver Bravo’s competitive events.</p>
          </div>
          <div className="rounded-[28px] border border-white/10 bg-slate-950/80 p-6">
            <p className="text-lg font-semibold text-white">Partner value</p>
            <ul className="mt-4 space-y-3 text-slate-300">
              <li>• Sponsor collaboration opportunities.</li>
              <li>• On-stream promotions.</li>
              <li>• Community and event support.</li>
            </ul>
          </div>
        </div>
      </section>
    </main>
  );
}
