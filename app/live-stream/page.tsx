import type { Metadata } from "next";
import Link from "next/link";
import { getLiveStreamFeed, getStreams, getVideos } from "@/lib/data";

export const metadata: Metadata = {
  title: "Live Stream",
  description: "Watch Bravo Gaming Esports live coverage, upcoming PUBG streams, and recent video highlights.",
};

export const revalidate = 300;

export default async function LiveStreamPage() {
  const [liveFeed, streams, videos] = await Promise.all([getLiveStreamFeed(), getStreams(), getVideos()]);

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div>
          <div className="mb-4 flex items-center gap-3">
            <span className="live-dot" />
            <span className="font-display text-label font-bold uppercase text-accent-red">
              {liveFeed.isLive ? "Live" : "Channel Feed"}
            </span>
            {liveFeed.viewers && <span className="font-mono-stat text-sm text-text-muted">{liveFeed.viewers}</span>}
          </div>
          <div className="overflow-hidden rounded-card border border-white/[0.08] bg-black">
            <iframe
              className="aspect-video w-full"
              src={liveFeed.embedUrl}
              title={liveFeed.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="font-display text-xl font-bold text-white">{liveFeed.title}</h1>
              <p className="text-sm text-text-muted">{liveFeed.description}</p>
            </div>
            <div className="flex gap-2">
              <a href={liveFeed.channelUrl} target="_blank" rel="noreferrer" className="btn-primary">
                {liveFeed.isLive ? "Watch on YouTube" : "Subscribe"}
              </a>
              <a href={liveFeed.supportUrl} target="_blank" rel="noreferrer" className="btn-discord">
                Support
              </a>
            </div>
          </div>
        </div>

        <aside className="esports-card p-5">
          <h2 className="section-heading !text-base">Upcoming Streams</h2>
          <div className="mt-4 space-y-3">
            {streams.map((stream) => (
              <div key={stream.id} className="border-b border-white/[0.05] pb-3 last:border-0">
                <p className="text-label uppercase text-text-muted">{stream.time.split(",")[0]}</p>
                <p className="mt-1 text-sm font-semibold text-white">{stream.title}</p>
                <span
                  className={`mt-1 inline-flex font-display text-label font-bold uppercase ${
                    stream.isLive ? "text-accent-red" : "text-accent-blue"
                  }`}
                >
                  {stream.isLive ? "Live Now" : `${stream.platform ?? "YouTube"} Stream`}
                </span>
              </div>
            ))}
          </div>
        </aside>
      </div>

      <section className="mt-10">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="section-heading !text-base">Latest Videos</h2>
          <Link href="/videos" className="text-label font-bold uppercase text-accent-blue hover:underline">
            View All
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {videos.map((video) => (
            <div key={video.id} className="video-card">
              <div className="relative aspect-video bg-bg-primary" />
              <div className="p-3">
                <p className="line-clamp-2 text-sm font-semibold text-white">{video.title}</p>
                <p className="text-label uppercase text-accent-blue">{video.category}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
