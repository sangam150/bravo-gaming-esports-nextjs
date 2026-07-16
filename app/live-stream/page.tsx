import type { Metadata } from "next";
import Link from "next/link";
import { getLiveStreamFeed, getStreams, getVideos } from "@/lib/data";
import { BRAVO_DISCORD_URL, BRAVO_YOUTUBE_URL } from "@/lib/brand-links";
import { buildContentMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildContentMetadata({
  title: "Live Stream | Bravo Gaming Esports",
  description: "Watch Bravo Gaming Esports live coverage, upcoming PUBG streams, and recent video highlights.",
  path: "/live-stream",
  type: "website",
});

export const revalidate = 300;

export default async function LiveStreamPage() {
  const [liveFeed, streams, videos] = await Promise.all([getLiveStreamFeed(), getStreams(), getVideos()]);
  const hasStreams = streams.length > 0;
  const hasVideos = videos.length > 0;
  const hasFeaturedBroadcast = hasStreams && Boolean(liveFeed.embedUrl);
  const watchOnYouTubeHref = liveFeed.channelUrl || BRAVO_YOUTUBE_URL;

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div>
          <div className="mb-4 flex items-center gap-3">
            <span className="live-dot" />
            <span className="font-display text-label font-bold uppercase text-accent-red">
              {liveFeed.isLive ? "Live" : "Channel Feed"}
            </span>
            {liveFeed.viewers && <span className="font-mono-stat text-sm text-text-muted">{liveFeed.viewers}</span>}
          </div>
          <div className="overflow-hidden rounded-card border border-white/[0.08] bg-black">
            {hasFeaturedBroadcast ? (
              <iframe
                className="aspect-video w-full"
                src={liveFeed.embedUrl}
                title={liveFeed.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            ) : (
              <div className="flex aspect-video flex-col items-center justify-center gap-4 p-8 text-center">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-accent-blue-light">Bravo Gaming Live</p>
                  <h2 className="mt-3 font-display text-2xl font-black uppercase text-white">Stream coverage returns here</h2>
                  <p className="mt-3 max-w-2xl text-sm text-text-muted">
                    Official broadcasts and tournament streams will appear here once the next Bravo live window is scheduled.
                  </p>
                </div>
                <div className="flex flex-wrap justify-center gap-3">
                  <a href={watchOnYouTubeHref} target="_blank" rel="noreferrer" className="btn-primary">
                    Watch on YouTube
                  </a>
                  <a href={BRAVO_DISCORD_URL} target="_blank" rel="noreferrer" className="btn-discord">
                    Join Discord
                  </a>
                  <Link href="/events" className="btn-secondary">
                    View Events
                  </Link>
                </div>
              </div>
            )}
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="font-display text-xl font-bold text-white">{hasFeaturedBroadcast ? liveFeed.title : "Bravo Gaming Live"}</h1>
              <p className="text-sm text-text-muted">{liveFeed.description}</p>
            </div>
            <div className="flex gap-2">
              <a href={watchOnYouTubeHref} target="_blank" rel="noreferrer" className="btn-primary">
                Watch on YouTube
              </a>
              <a href={BRAVO_DISCORD_URL} target="_blank" rel="noreferrer" className="btn-discord">
                Join Discord
              </a>
              <Link href="/events" className="btn-secondary">
                View Events
              </Link>
            </div>
          </div>
        </div>

        <aside className="esports-card p-5">
          <h2 className="section-heading !text-base">Upcoming Streams</h2>
          {hasStreams ? (
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
          ) : (
            <div className="mt-4 rounded-card border border-white/[0.08] bg-black/20 p-4 text-sm text-text-muted">
              Upcoming broadcasts will appear here after the next official stream is scheduled.
            </div>
          )}
        </aside>
      </div>

      <section className="mt-10">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="section-heading !text-base">Latest Videos</h2>
          <Link href="/videos" className="text-label font-bold uppercase text-accent-blue hover:underline">
            View All
          </Link>
        </div>
        {hasVideos ? (
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
        ) : (
          <div className="esports-card p-6 text-sm text-text-muted">No videos are currently available. Check back later for new content and broadcasts.</div>
        )}
      </section>
    </main>
  );
}
