import Link from "next/link";

export default function SchedulePage() {
  return (
    <main className="mx-auto max-w-7xl px-6 py-10 sm:px-8 lg:py-14">
      <section className="glass-panel p-8">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="section-title">Schedule</p>
            <h1 className="mt-4 text-4xl font-black tracking-[-0.04em] text-white sm:text-5xl">Match and stream schedule</h1>
            <p className="mt-5 max-w-3xl text-slate-300">Find all upcoming PUBG PC scrims, tournament match dates, and live broadcast slots in one premium esports schedule page.</p>
          </div>
          <Link href="/" className="rounded-full bg-bravoBlue px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-white/90">
            Back to Home
          </Link>
        </div>
        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <div className="rounded-[28px] border border-white/10 bg-slate-950/80 p-6">
            <p className="text-lg font-semibold text-white">Live event rhythm</p>
            <p className="mt-3 text-slate-300">Weekly scheduled scrims and tournament rounds keep the Bravo scene moving. Check the upcoming schedule for match start times, maps, and broadcast timelines.</p>
          </div>
          <div className="rounded-[28px] border border-white/10 bg-slate-950/80 p-6">
            <p className="text-lg font-semibold text-white">Stay prepared</p>
            <ul className="mt-4 space-y-3 text-slate-300">
              <li>• Daily PUBG scrims and event previews.</li>
              <li>• Broadcast timings for live stream coverage.</li>
              <li>• Advance notice for tournament registration and check-ins.</li>
            </ul>
          </div>
        </div>
      </section>
    </main>
  );
}
