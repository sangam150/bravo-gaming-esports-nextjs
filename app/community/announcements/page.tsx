import Link from "next/link";
import { getAnnouncements } from "@/lib/data";

export default async function CommunityAnnouncementsPage() {
  const announcements = await getAnnouncements();

  return (
    <main className="mx-auto max-w-7xl px-6 py-10 sm:px-8 lg:py-14">
      <section className="glass-panel p-8">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="section-title">Community</p>
            <h1 className="mt-4 text-4xl font-black tracking-[-0.04em] text-white sm:text-5xl">Announcements</h1>
            <p className="mt-5 max-w-3xl text-slate-300">
              Official Bravo community updates, event alerts, roster changes, and tournament notices.
            </p>
          </div>
          <Link
            href="/community"
            className="rounded-full bg-bravoBlue px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-white/90"
          >
            Back to Community
          </Link>
        </div>

        {announcements.length === 0 ? (
          <div className="mt-10 rounded-[28px] border border-dashed border-white/10 bg-slate-950/80 p-8 text-center text-sm text-text-muted">
            Community announcements will appear here after they are published from admin.
          </div>
        ) : (
          <div className="mt-10 space-y-6">
            {announcements.map((announcement) => (
              <article key={announcement.id} className="rounded-[28px] border border-white/10 bg-slate-950/80 p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm uppercase tracking-[0.18em] text-accent-blue">{announcement.date}</p>
                  <span className="rounded-full bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.16em] text-white">
                    {announcement.category ?? "Announcement"}
                  </span>
                </div>
                <h2 className="mt-4 text-2xl font-semibold text-white">{announcement.title}</h2>
                <p className="mt-3 text-slate-300">{announcement.detail}</p>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
