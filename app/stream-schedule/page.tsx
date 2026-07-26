import { getLiveStreamFeed, getStreams } from "@/lib/data";
import Link from "next/link";

export default async function StreamSchedulePage() {
  const [liveFeed, streams] = await Promise.all([getLiveStreamFeed(), getStreams()]);
  const hasStreams = streams.length > 0;

  return (
    <main className="mx-auto max-w-7xl px-6 py-10 sm:px-8 lg:py-14">
      <section className="glass-panel p-8">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="section-title">Live</p>
            <h1 className="mt-4 text-4xl font-black tracking-[-0.04em] text-white sm:text-5xl">Stream schedule</h1>
            <p className="mt-5 max-w-3xl text-slate-300">
              See every upcoming live broadcast, esports stream, and production window on the Bravo portal.
            </p>
          </div>
          <Link href="/" className="rounded-full bg-bravoBlue px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-white/90">
            Back to Home
          </Link>
        </div>
        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <div className="rounded-[28px] border border-white/10 bg-slate-950/80 p-6">
            <p className="text-lg font-semibold text-white">{liveFeed.isLive ? "Live coverage" : "Channel feed"}</p>
            <p className="mt-3 text-slate-300">
              {liveFeed.isLive
                ? "You are live right now. Visitors can open the live-stream page and watch the embedded broadcast instantly."
                : "When your YouTube channel goes live, the live-stream page can show the live player automatically if you set your channel ID."}
            </p>
            <div className="mt-5">
              <Link
                href="/live-stream"
                className="rounded-full bg-bravoBlue px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-white/90"
              >
                Open Live Stream Page
              </Link>
            </div>
          </div>
          <div className="rounded-[28px] border border-white/10 bg-slate-950/80 p-6">
            <p className="text-lg font-semibold text-white">Follow every stream</p>
            {hasStreams ? (
              <div className="mt-4 space-y-3 text-slate-300">
                {streams.map((stream) => (
                  <div key={stream.id} className="rounded-[20px] border border-white/10 bg-slate-900/80 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold text-white">{stream.title}</p>
                      <span className={`text-xs font-semibold uppercase ${stream.isLive ? "text-red-300" : "text-accent-blue"}`}>
                        {stream.isLive ? "Live" : (stream.platform ?? "YouTube")}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-slate-400">{stream.time}</p>
                    {stream.description && <p className="mt-2 text-sm text-slate-300">{stream.description}</p>}
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm text-text-muted">
                Official broadcasts and tournament streams will appear here once the next Bravo live window is scheduled.
              </p>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
