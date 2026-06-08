import Link from "next/link";
import { getStreams, getVideos } from "@/lib/data";

export default async function LiveStreamPage() {
  const [streams, videos] = await Promise.all([getStreams(), getVideos()]);

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div>
          <div className="mb-4 flex items-center gap-3">
            <span className="live-dot" />
            <span className="font-display text-label font-bold uppercase text-accent-red">Live</span>
            <span className="font-mono-stat text-sm text-text-muted">1.2K viewers</span>
          </div>
          <div className="overflow-hidden rounded-card border border-white/[0.08] bg-black">
            <iframe
              className="aspect-video w-full"
              src="https://www.youtube.com/embed?listType=user_uploads&list=bravogamingnepal7981"
              title="Bravo Gaming Nepal Live"
              allowFullScreen
            />
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="font-display text-xl font-bold text-white">Bravo Gaming Nepal</h1>
              <p className="text-sm text-text-muted">PUBG PC Daily Scrims & Tournament Finals</p>
            </div>
            <div className="flex gap-2">
              <a href="https://www.youtube.com/@bravogamingnepal7981" target="_blank" rel="noreferrer" className="btn-primary">Subscribe</a>
              <a href="https://kamaucha.me/bravo" target="_blank" rel="noreferrer" className="btn-discord">Support</a>
            </div>
          </div>
        </div>

        <aside className="esports-card p-5">
          <h2 className="section-heading !text-base">Upcoming Streams</h2>
          <div className="mt-4 space-y-3">
            {streams.map((s) => (
              <div key={s.id} className="border-b border-white/[0.05] pb-3 last:border-0">
                <p className="text-label uppercase text-text-muted">{s.time.split(",")[0]}</p>
                <p className="mt-1 text-sm font-semibold text-white">{s.title}</p>
                <span className="mt-1 inline-flex font-display text-label font-bold uppercase text-accent-red">YouTube Live</span>
              </div>
            ))}
          </div>
        </aside>
      </div>

      <section className="mt-10">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="section-heading !text-base">Latest Videos</h2>
          <Link href="/videos" className="text-label font-bold uppercase text-accent-blue hover:underline">View All →</Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {videos.map((v) => (
            <div key={v.id} className="video-card">
              <div className="relative aspect-video bg-bg-primary" />
              <div className="p-3">
                <p className="line-clamp-2 text-sm font-semibold text-white">{v.title}</p>
                <p className="text-label uppercase text-accent-blue">{v.category}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
