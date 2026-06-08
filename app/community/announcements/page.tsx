import Link from "next/link";

export default function CommunityAnnouncementsPage() {
  return (
    <main className="mx-auto max-w-7xl px-6 py-10 sm:px-8 lg:py-14">
      <section className="glass-panel p-8">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="section-title">Community</p>
            <h1 className="mt-4 text-4xl font-black tracking-[-0.04em] text-white sm:text-5xl">Announcements</h1>
            <p className="mt-5 max-w-3xl text-slate-300">Stay current with official Bravo community updates, event alerts, and crew announcements.</p>
          </div>
          <Link href="/community" className="rounded-full bg-bravoBlue px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-white/90">
            Back to Community
          </Link>
        </div>
        <div className="mt-10 space-y-6">
          <div className="rounded-[28px] border border-white/10 bg-slate-950/80 p-6">
            <p className="text-lg font-semibold text-white">Latest updates</p>
            <p className="mt-3 text-slate-300">Discord registration, team announcements, and sponsor callouts are published here first.</p>
          </div>
          <div className="rounded-[28px] border border-white/10 bg-slate-950/80 p-6">
            <p className="text-lg font-semibold text-white">Community first</p>
            <ul className="mt-4 space-y-3 text-slate-300">
              <li>• Event registration reminders.</li>
              <li>• Player callouts and roster updates.</li>
              <li>• Announcements for upcoming scrims.</li>
            </ul>
          </div>
        </div>
      </section>
    </main>
  );
}
