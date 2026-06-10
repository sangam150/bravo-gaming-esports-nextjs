import Link from "next/link";
import { getAnnouncements } from "@/lib/data";

export default async function NewsPage() {
  const updates = await getAnnouncements();

  return (
    <main className="mx-auto max-w-7xl px-6 py-10 sm:px-8 lg:py-14">
      <section className="glass-panel p-8">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="section-title">News</p>
            <h1 className="section-heading">Latest Bravo Updates</h1>
            <p className="mt-5 max-w-2xl text-slate-300">Stay informed about upcoming tournaments, livestream changes, player announcements, and community events.</p>
          </div>
          <Link href="/admin" className="btn-esports-primary">
            Admin Portal
          </Link>
        </div>

        <div className="mt-10 space-y-6">
          {updates.length === 0 ? (
            <div className="esports-card p-8 text-center text-sm text-text-muted">
              Data not imported yet. Publish announcements from the admin dashboard to populate this page.
            </div>
          ) : (
            updates.map((item) => (
              <article key={item.id} className="esports-card p-6 transition hover:border-bravoBlue/30">
                <div className="flex items-center justify-between gap-4 text-slate-400">
                  <p className="text-sm uppercase tracking-[0.24em]">{item.date}</p>
                  <span className="rounded-full bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.24em] text-white">
                    Update
                  </span>
                </div>
                <h2 className="mt-4 text-2xl font-semibold text-white">{item.title}</h2>
                <p className="mt-3 text-slate-300">{item.detail}</p>
              </article>
            ))
          )}
        </div>
      </section>
    </main>
  );
}
