import { searchPlatformContent } from "@/lib/search-service";
import type { Metadata } from "next";
import Link from "next/link";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const metadata: Metadata = {
  title: "Search",
  description: "Search Bravo Gaming teams, players, events, matches, seasons, news, sponsors, and media.",
  robots: {
    index: false,
    follow: true,
  },
};

function getSingleSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

export default async function SearchPage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;
  const query = getSingleSearchParam(resolvedSearchParams.q);
  const results = await searchPlatformContent(query);

  return (
    <main className="page-shell">
      <div className="page-inner">
        <section className="page-hero p-6 sm:p-8">
          <p className="section-title">Global Search</p>
          <h1 className="hero-h1 mt-2 !text-4xl sm:!text-5xl">Find teams, players, events, matches, seasons, media, and sponsors</h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-text-muted sm:text-base">
            Search the full Bravo platform from one place, with PUBG coverage leading the way.
          </p>

          <form action="/search" method="get" className="mt-6 flex flex-col gap-3 sm:flex-row">
            <input
              type="search"
              name="q"
              minLength={2}
              defaultValue={results.query}
              placeholder="Search Bravo Gaming"
              className="input-esports w-full"
            />
            <button type="submit" className="btn-primary shrink-0">
              Search
            </button>
          </form>

          <div className="mt-5 flex flex-wrap gap-2 text-xs uppercase tracking-[0.14em] text-text-muted">
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5">Teams</span>
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5">Players</span>
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5">Events</span>
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5">Matches</span>
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5">Seasons</span>
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5">News</span>
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5">Sponsors</span>
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5">Media</span>
          </div>
        </section>

        {!results.query ? (
          <section className="mt-8 grid gap-4 md:grid-cols-3">
            {[
              {
                title: "PUBG Teams",
                href: "/pubg/teams",
                description: "Track rosters, form, and standings.",
              },
              {
                title: "Latest Events",
                href: "/events",
                description: "Open published event pages and schedules.",
              },
              {
                title: "Media Hub",
                href: "/media",
                description: "Browse highlights, VODs, posters, and interviews.",
              },
            ].map((item) => (
              <Link key={item.href} href={item.href} className="esports-card p-6 transition hover:border-accent-blue/30 hover:bg-bg-hover">
                <p className="font-display text-lg font-black uppercase text-white">{item.title}</p>
                <p className="mt-3 text-sm leading-6 text-text-muted">{item.description}</p>
              </Link>
            ))}
          </section>
        ) : results.total === 0 ? (
          <section className="mt-8 esports-card p-8 text-center">
            <h2 className="text-2xl font-black text-white">No results found</h2>
            <p className="mt-3 text-sm text-text-muted">No results found. Try adjusting your search or browse available categories.</p>
          </section>
        ) : (
          <section className="mt-8 space-y-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="section-title">Search Results</p>
                <h2 className="mt-2 text-3xl font-black text-white">
                  {results.total} result{results.total === 1 ? "" : "s"} for &ldquo;{results.query}&rdquo;
                </h2>
              </div>
            </div>

            {results.groups.map((group) => (
              <div key={group.kind} className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-display text-xl font-black uppercase text-white">{group.label}</h3>
                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-text-muted">
                    {group.count}
                  </span>
                </div>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {group.items.map((item) => (
                    <Link
                      key={`${item.kind}-${item.href}`}
                      href={item.href}
                      className="esports-card p-5 transition hover:border-accent-blue/30 hover:bg-bg-hover"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="rounded-full border border-accent-blue/20 bg-accent-blue/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-accent-blue">
                          {item.badge}
                        </span>
                        <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-text-muted">{item.subtitle}</span>
                      </div>
                      <h4 className="mt-4 text-lg font-black text-white">{item.title}</h4>
                      <p className="mt-3 text-sm leading-6 text-text-muted">{item.description}</p>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}
