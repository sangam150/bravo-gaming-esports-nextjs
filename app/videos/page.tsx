import Link from "next/link";
import { getVideos } from "@/lib/data";

export default async function VideosPage() {
  const videos = await getVideos();

  return (
    <main className="mx-auto max-w-7xl px-6 py-10 sm:px-8 lg:py-14">
      <section className="glass-panel p-8">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="section-title">Videos & Highlights</p>
            <h1 className="mt-4 text-4xl font-black tracking-[-0.04em] text-white sm:text-5xl">Stream Clips & Replay</h1>
            <p className="mt-5 max-w-2xl text-slate-300">
              Stored Bravo videos and highlight reels appear here after they are published to Firestore.
            </p>
          </div>
          <Link
            href="https://www.youtube.com/@bravogamingnepal7981"
            className="rounded-full bg-bravoBlue px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-white/90"
            target="_blank"
          >
            View Channel
          </Link>
        </div>

        {videos.length === 0 ? (
          <div className="mt-10 rounded-[28px] border border-dashed border-white/10 bg-slate-950/80 p-8 text-center text-sm text-text-muted">
            Data not imported yet. Add videos in Firestore to publish them on this page.
          </div>
        ) : (
          <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {videos.map((video) => (
              <article key={video.id} className="rounded-[28px] border border-white/10 bg-slate-950/80 p-6">
                <div className="h-48 rounded-3xl bg-slate-900/80" />
                <h2 className="mt-6 text-2xl font-semibold text-white">{video.title}</h2>
                <p className="mt-3 text-slate-300">{video.category}</p>
                <p className="mt-2 text-sm text-text-muted">{video.duration}</p>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
