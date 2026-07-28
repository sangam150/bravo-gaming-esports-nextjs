import {
  PublicActionLink,
  PublicCommunityCta,
  PublicEmptyState,
  PublicPageHero,
  PublicSectionHeader,
  PublicStatusBadge,
  formatPublicDate,
  joinClasses,
  readSearchParam,
  type SearchParamDictionary,
} from "@/components/public/PublicDesignSystem";
import ManagedImage from "@/components/ui/ManagedImage";
import { BRAVO_DISCORD_URL } from "@/lib/brand-links";
import type { PlatformArticle, PlatformHubData } from "@/lib/platform-hub";
import { ArrowRight, CalendarDays, Clock3, Mail, Search, ShieldCheck } from "lucide-react";
import Link from "next/link";
import {
  ChannelLinks,
  FilterTabs,
  isCompatibilityFallback,
  normalizePage,
  PaginationNav,
} from "./ContentPageShared";

const NEWS_PAGE_SIZE = 9;

function articleReadTime(article: PlatformArticle) {
  const words = [article.title, article.summary, article.excerpt, ...article.body]
    .filter(Boolean)
    .join(" ")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 220));
}

function articleSearchText(article: PlatformArticle) {
  return `${article.title} ${article.summary} ${article.excerpt ?? ""} ${article.category} ${article.tags.join(" ")}`.toLowerCase();
}

function articleMatchesCategory(article: PlatformArticle, category: string) {
  if (category === "all") return true;
  const text = articleSearchText(article);
  const categoryTerms: Record<string, string[]> = {
    announcements: ["announcement", "announced"],
    tournaments: ["tournament", "event", "competition"],
    updates: ["update", "patch", "platform"],
    results: ["result", "recap", "winner", "standings"],
  };
  return (categoryTerms[category] ?? [category]).some((term) => text.includes(term));
}

function NewsVisual({
  article,
  className,
  priority = false,
}: {
  article: PlatformArticle;
  className: string;
  priority?: boolean;
}) {
  if (article.imageUrl) {
    return (
      <ManagedImage
        src={article.imageUrl}
        alt={article.title}
        priority={priority}
        sizes="(min-width: 1280px) 34vw, (min-width: 768px) 50vw, 100vw"
        wrapperClassName={className}
        className="object-cover"
      />
    );
  }
  return (
    <div
      className={joinClasses(
        className,
        "relative bg-[radial-gradient(circle_at_30%_20%,rgba(8,102,255,0.22),transparent_36%),linear-gradient(145deg,#091727,#020812)]",
      )}
      role="img"
      aria-label={`${article.title} has no published article image`}
    >
      <ShieldCheck className="absolute bottom-5 right-5 h-14 w-14 text-white/10" aria-hidden="true" />
    </div>
  );
}

function FeaturedArticle({ article }: { article: PlatformArticle }) {
  return (
    <Link
      href={`/news/${article.slug}`}
      className="public-card group grid min-w-0 overflow-hidden transition hover:border-accent-blue/45 sm:grid-cols-[0.9fr_1.1fr]"
    >
      <NewsVisual article={article} priority className="h-48 w-full sm:h-full sm:min-h-[250px]" />
      <div className="flex min-w-0 flex-col p-5">
        <div className="flex flex-wrap gap-2">
          <PublicStatusBadge tone="blue">Featured</PublicStatusBadge>
          <PublicStatusBadge>{article.category}</PublicStatusBadge>
        </div>
        <h2 className="mt-4 font-display text-2xl font-bold leading-tight text-white group-hover:text-accent-blue-light">
          {article.title}
        </h2>
        <p className="mt-3 line-clamp-3 text-sm leading-6 text-text-secondary">
          {article.excerpt?.trim() || article.summary}
        </p>
        <div className="mt-auto flex flex-wrap items-center gap-4 pt-5 text-xs text-text-muted">
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
            {formatPublicDate(article.publishedAt ?? article.date)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
            {articleReadTime(article)} min read
          </span>
        </div>
        <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-accent-blue-light">
          Read Full Story
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </span>
      </div>
    </Link>
  );
}

function NewsCard({ article }: { article: PlatformArticle }) {
  return (
    <Link
      href={`/news/${article.slug}`}
      className="public-card group flex min-w-0 flex-col overflow-hidden transition hover:border-accent-blue/45"
    >
      <div className="relative">
        <NewsVisual article={article} className="h-44 w-full" />
        <div className="absolute left-3 top-3">
          <PublicStatusBadge tone="blue">{article.category}</PublicStatusBadge>
        </div>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="line-clamp-2 font-display text-xl font-bold leading-tight text-white group-hover:text-accent-blue-light">
          {article.title}
        </h3>
        <p className="mt-3 line-clamp-3 text-sm leading-6 text-text-muted">
          {article.excerpt?.trim() || article.summary}
        </p>
        <div className="mt-auto flex items-center justify-between gap-3 pt-5 text-[11px] text-text-muted">
          <span>{formatPublicDate(article.publishedAt ?? article.date)}</span>
          <span>{articleReadTime(article)} min read</span>
        </div>
      </div>
    </Link>
  );
}

function LatestAnnouncements({ articles }: { articles: PlatformArticle[] }) {
  return (
    <section className="public-panel p-4">
      <h2 className="font-display text-xl font-bold uppercase text-white">Latest Announcements</h2>
      {articles.length > 0 ? (
        <div className="mt-4 divide-y divide-white/10">
          {articles.slice(0, 4).map((article) => (
            <Link key={article.id} href={`/news/${article.slug}`} className="block py-4 first:pt-0 last:pb-0">
              <p className="line-clamp-2 text-sm font-semibold leading-5 text-white transition hover:text-accent-blue-light">
                {article.title}
              </p>
              <p className="mt-2 text-[11px] text-text-muted">
                {formatPublicDate(article.publishedAt ?? article.date)}
              </p>
            </Link>
          ))}
        </div>
      ) : (
        <p className="mt-4 text-sm leading-6 text-text-muted">
          No announcement-category stories have been published.
        </p>
      )}
    </section>
  );
}

function NewsletterUnavailable() {
  return (
    <section className="public-panel border-accent-blue/35 p-4">
      <Mail className="h-6 w-6 text-accent-blue-light" aria-hidden="true" />
      <h2 className="mt-3 font-display text-xl font-bold uppercase text-white">Email Updates</h2>
      <p className="mt-2 text-sm leading-6 text-text-muted">
        Newsletter signup is not available yet. Follow Bravo’s official channels for published updates.
      </p>
      <button type="button" disabled className="btn-secondary mt-4 w-full cursor-not-allowed justify-center opacity-50">
        Subscription unavailable
      </button>
    </section>
  );
}

function FollowBravo() {
  return (
    <section className="public-panel p-4">
      <h2 className="font-display text-xl font-bold uppercase text-white">Follow Bravo Gaming</h2>
      <p className="mt-2 text-sm leading-6 text-text-muted">
        Get real-time public updates through configured official channels.
      </p>
      <div className="mt-4">
        <ChannelLinks />
      </div>
    </section>
  );
}

export function NewsReferencePage({
  hub,
  searchParams,
}: {
  hub: PlatformHubData;
  searchParams: SearchParamDictionary;
}) {
  const publishedNews = hub.news.filter((article) => !isCompatibilityFallback(article.id));
  const categoryValue = readSearchParam(searchParams.category, "all").toLowerCase();
  const category = ["all", "announcements", "tournaments", "updates", "results"].includes(categoryValue)
    ? categoryValue
    : "all";
  const queryValue = readSearchParam(searchParams.q).trim();
  const query = queryValue.toLowerCase();
  const filteredNews = publishedNews.filter(
    (article) =>
      articleMatchesCategory(article, category) && (!query || articleSearchText(article).includes(query)),
  );
  const totalPages = Math.max(1, Math.ceil(filteredNews.length / NEWS_PAGE_SIZE));
  const page = normalizePage(searchParams.page, totalPages);
  const pageArticles = filteredNews.slice((page - 1) * NEWS_PAGE_SIZE, page * NEWS_PAGE_SIZE);
  const featuredArticle =
    publishedNews.find((article) => article.featured) ??
    publishedNews.find((article) => article.breaking) ??
    publishedNews[0] ??
    null;
  const announcements = publishedNews.filter((article) => articleMatchesCategory(article, "announcements"));

  return (
    <main className="public-page">
      <PublicPageHero
        eyebrow="Home / News"
        title="News"
        description="Read official Bravo Gaming Esports announcements, tournament coverage, platform updates, and published results."
        aside={
          featuredArticle ? (
            <FeaturedArticle article={featuredArticle} />
          ) : (
            <PublicEmptyState
              compact
              title="No featured story yet"
              description="A featured article will appear here after the newsroom publishes approved coverage."
            />
          )
        }
      />

      <div className="public-container space-y-6 py-6">
        <section className="public-panel p-3 sm:p-4">
          <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-3 xl:grid-cols-[minmax(0,1fr)_20rem] xl:items-center">
            <FilterTabs
              pathname="/news"
              searchParams={searchParams}
              paramName="category"
              activeValue={category}
              label="Filter news by category"
              items={[
                { label: "All News", value: "all" },
                { label: "Announcements", value: "announcements" },
                { label: "Tournaments", value: "tournaments" },
                { label: "Updates", value: "updates" },
                { label: "Results", value: "results" },
              ]}
            />
            <form action="/news" method="get" className="flex min-w-0 gap-2">
              {category !== "all" ? <input type="hidden" name="category" value={category} /> : null}
              <label className="flex min-h-10 min-w-0 flex-1 items-center gap-2 rounded-[4px] border border-white/15 bg-black/25 px-3 transition focus-within:border-accent-blue focus-within:ring-2 focus-within:ring-accent-blue/20">
                <Search className="h-4 w-4 text-text-muted" aria-hidden="true" />
                <span className="sr-only">Search news</span>
                <input
                  type="search"
                  name="q"
                  defaultValue={queryValue}
                  placeholder={"Search news\u2026"}
                  className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-text-muted"
                />
              </label>
              <button type="submit" className="btn-primary min-h-10 !px-4 !py-2">
                Search
              </button>
            </form>
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_18rem]">
          <section className="min-w-0 space-y-5">
            <PublicSectionHeader
              eyebrow="Latest Stories"
              title="Published News"
              action={
                <span className="text-xs text-text-muted">
                  {filteredNews.length} {filteredNews.length === 1 ? "story" : "stories"}
                </span>
              }
            />
            {pageArticles.length > 0 ? (
              <>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {pageArticles.map((article) => (
                    <NewsCard key={article.id} article={article} />
                  ))}
                </div>
                <PaginationNav
                  pathname="/news"
                  searchParams={searchParams}
                  currentPage={page}
                  totalPages={totalPages}
                />
              </>
            ) : (
              <PublicEmptyState
                title={publishedNews.length === 0 ? "No published news yet" : "No stories match this search"}
                description={
                  publishedNews.length === 0
                    ? "Official stories will appear here after editorial review and publication."
                    : "Try another category or search phrase."
                }
                action={
                  publishedNews.length > 0 ? (
                    <PublicActionLink href="/news" variant="secondary">
                      Clear Filters
                    </PublicActionLink>
                  ) : (
                    <PublicActionLink href={BRAVO_DISCORD_URL} variant="discord">
                      Follow Updates
                    </PublicActionLink>
                  )
                }
              />
            )}
          </section>

          <aside className="space-y-4">
            <LatestAnnouncements articles={announcements} />
            <NewsletterUnavailable />
            <FollowBravo />
          </aside>
        </div>

        <PublicCommunityCta />
      </div>
    </main>
  );
}
