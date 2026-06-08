import Link from "next/link";

export default function SponsorUsPage() {
  return (
    <main className="mx-auto max-w-7xl px-6 py-10 sm:px-8 lg:py-14">
      <section className="glass-panel p-8">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="section-title">About</p>
            <h1 className="mt-4 text-4xl font-black tracking-[-0.04em] text-white sm:text-5xl">Sponsor Us</h1>
            <p className="mt-5 max-w-3xl text-slate-300">Partner with Bravo Gaming Esports for brand exposure across competitive tournaments and live stream events.</p>
          </div>
          <Link href="/contact" className="rounded-full bg-bravoBlue px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-white/90">
            Contact us
          </Link>
        </div>
        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <div className="rounded-[28px] border border-white/10 bg-slate-950/80 p-6">
            <p className="text-lg font-semibold text-white">Sponsorship benefits</p>
            <p className="mt-3 text-slate-300">Access the esports community with elevated branding, live event displays, and partner promotion across our league fixtures.</p>
          </div>
          <div className="rounded-[28px] border border-white/10 bg-slate-950/80 p-6">
            <p className="text-lg font-semibold text-white">Why sponsor</p>
            <ul className="mt-4 space-y-3 text-slate-300">
              <li>• Targeted esports audience.</li>
              <li>• Live stream and social exposure.</li>
              <li>• Official event partner placement.</li>
            </ul>
          </div>
        </div>
      </section>
    </main>
  );
}
