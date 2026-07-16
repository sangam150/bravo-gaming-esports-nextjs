import Link from "next/link";
import ManagedImage from "@/components/ui/ManagedImage";
import {
  EmptyState,
  PageHero,
  SectionHeader,
  buildHref,
  formatDate,
  readSearchParam,
} from "@/components/pubg/PubgHubUI";
import { BRAVO_DISCORD_URL } from "@/lib/brand-links";
import { formatDisplayDateTime } from "@/lib/display-format";
import type { PlatformArticle, PlatformHubData } from "@/lib/platform-hub";
import { getSiteUrl } from "@/lib/site";

type SearchParamDictionary = Record<string, string | string[] | undefined>;

function buildArticleSummary(article: PlatformArticle) {
  return article.excerpt?.trim() || article.summary;
}

function buildAbsoluteUrl(pathOrUrl: string) {
  return new URL(pathOrUrl, getSiteUrl()).toString();
}

function buildArticleCanonicalUrl(article: PlatformArticle) {
  return buildAbsoluteUrl(article.canonicalUrl || `/news/${article.slug}`);
}

function formatArticleDate(article: PlatformArticle) {
  return formatDate(article.publishedAt ?? article.date);
}

function formatUpdatedLabel(value?: string) {
  if (!value) {
    return null;
  }

  return formatDisplayDateTime(value);
}

function CategoryPill({ label }: { label: string }) {
  return (
    <span className="rounded-full border border-white/10 bg-bg-primary px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-text-muted">
      {label}
    </span>
  );
}

function ArticleActionLink({
  href,
  label,
  className,
}: {
  href: string;
  label: string;
  className: string;
}) {
  if (/^https?:\/\//i.test(href)) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={className}>
        {label}
      </a>
    );
  }

  return (
    <Link href={href} className={className}>
      {label}
    </Link>
  );
}

function NewsCard({ article }: { article: PlatformArticle }) {
  return (
    <Link
      href={`/news/${article.slug}`}
      className="flex h-full flex-col rounded-card border border-white/[0.08] bg-bg-card p-5 transition hover:border-accent-green/25 hover:bg-bg-hover"
    >
      {article.imageUrl ? (
        <ManagedImage
          src={article.imageUrl}
          alt={article.title}
          sizes="(min-width: 1280px) 30vw, (min-width: 768px) 45vw, 100vw"
          wrapperClassName="mb-4 h-48 rounded-card border border-white/[0.08]"
          className="object-cover"
        />
      ) : (
        <div className="mb-4 h-48 rounded-card border border-white/[0.08] bg-[radial-gradient(circle_at_top_left,rgba(47,152,255,0.18),transparent_30%),linear-gradient(180deg,rgba(16,24,43,0.96),rgba(8,14,28,0.96))]" />
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <CategoryPill label={article.category} />
          {article.breaking ? <CategoryPill label="Breaking" /> : null}
        </div>
        <p className="text-xs uppercase tracking-[0.16em] text-text-muted">{formatArticleDate(article)}</p>
      </div>
      <h2 className="mt-4 font-display text-2xl font-black tracking-tight text-white">{article.title}</h2>
      <p className="mt-3 text-sm leading-7 text-slate-300">{buildArticleSummary(article)}</p>
      <div className="mt-4 flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.16em] text-text-muted">
        <span>{article.authorName}</span>
        {article.tags.slice(0, 3).map((tag) => (
          <span key={tag}>{tag}</span>
        ))}
      </div>
    </Link>
  );
}

function DetailBreadcrumbs({ article }: { article: PlatformArticle }) {
  return (
    <nav
      aria-label="Breadcrumb"
      className="flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-text-muted"
    >
      <Link href="/" className="transition hover:text-white">
        Home
      </Link>
      <span className="text-white/30">/</span>
      <Link href="/news" className="transition hover:text-white">
        News
      </Link>
      <span className="text-white/30">/</span>
      <span className="text-white">{article.title}</span>
    </nav>
  );
}

function ArticleUtilityBar({ article }: { article: PlatformArticle }) {
  const absoluteUrl = buildArticleCanonicalUrl(article);
  const updatedLabel = formatUpdatedLabel(article.updatedAt ?? article.publishedAt);
  const shareText = `${article.title} | Bravo Gaming Esports`;

  return (
    <section className="rounded-card border border-white/[0.08] bg-bg-card px-5 py-4">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="space-y-2">
          <DetailBreadcrumbs article={article} />
          {updatedLabel ? <p className="text-xs text-text-muted">Last updated {updatedLabel}</p> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(absoluteUrl)}`}
            target="_blank"
            rel="noreferrer"
            className="btn-secondary !px-3 !py-2 !text-[11px]"
          >
            Share on X
          </a>
          <a
            href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(absoluteUrl)}`}
            target="_blank"
            rel="noreferrer"
            className="btn-secondary !px-3 !py-2 !text-[11px]"
          >
            Share on Facebook
          </a>
          <a
            href={`https://wa.me/?text=${encodeURIComponent(`${shareText} ${absoluteUrl}`)}`}
            target="_blank"
            rel="noreferrer"
            className="btn-secondary !px-3 !py-2 !text-[11px]"
          >
            Share on WhatsApp
          </a>
        </div>
      </div>
    </section>
  );
}

export function NewsIndexPage({
  hub,
  searchParams,
}: {
  hub: PlatformHubData;
  searchParams: SearchParamDictionary;
}) {
  const queryValue = readSearchParam(searchParams.q).trim();
  const query = queryValue.toLowerCase();
  const category = readSearchParam(searchParams.category, "all");
  const hasNews = hub.news.length > 0;
  const categories = Array.from(new Set(hub.news.map((article) => article.category))).sort((firstValue, secondValue) =>
    firstValue.localeCompare(secondValue)
  );
  const filteredArticles = hub.news.filter((article) => {
    if (category !== "all" && article.category !== category) {
      return false;
    }

    if (query && !`${article.title} ${buildArticleSummary(article)} ${article.tags.join(" ")}`.toLowerCase().includes(query)) {
      return false;
    }

    return true;
  });

  return (
    <main className="page-shell pb-12 pt-6">
      <div className="page-stack">
        <PageHero
          badge="News"
          title={
            <>
              Latest news
              <br />
              and official updates
            </>
          }
          description={
            hasNews
              ? "Official announcements, tournament updates, and community stories from Bravo Gaming Esports."
              : "Official announcements, tournament updates, and community stories from Bravo Gaming Esports."
          }
          actions={
            <>
              <Link href="/events" className="btn-secondary">
                Explore Events
              </Link>
              <ArticleActionLink href={BRAVO_DISCORD_URL} label="Follow Updates" className="btn-primary" />
            </>
          }
          stats={
            hasNews
              ? [
                  { label: "Stories", value: hub.news.length, tone: "blue" as const },
                  { label: "Featured", value: hub.news.filter((article) => article.featured).length, tone: "green" as const },
                  { label: "Topics", value: categories.length, tone: "yellow" as const },
                  { label: "Breaking", value: hub.news.filter((article) => article.breaking).length, tone: "red" as const },
                ]
              : undefined
          }
          aside={hasNews ? (
            <div className="space-y-4">
              <div>
                <p className="section-title">Official Updates</p>
                <h2 className="mt-2 font-display text-2xl font-black uppercase text-white">Bravo news desk</h2>
              </div>
              <div className="rounded-card border border-white/[0.08] bg-black/20 px-4 py-3 text-sm text-white">
                Tournament announcements, published results, and community updates appear here after review.
              </div>
              <div className="rounded-card border border-white/[0.08] bg-black/20 px-4 py-3 text-sm text-white">
                Breaking announcements and event stories are posted here as they go live.
              </div>
              <div className="rounded-card border border-white/[0.08] bg-black/20 px-4 py-3 text-sm text-white">
                Use Discord and the events board for immediate match-day updates.
              </div>
            </div>
          ) : undefined}
        />

        {!hasNews ? (
          <EmptyState
            title="Latest news coming soon"
            description="Announcements, tournament updates, and community stories will appear here soon."
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <Link href="/events" className="btn-secondary">
                  Browse Events
                </Link>
                <ArticleActionLink href={BRAVO_DISCORD_URL} label="Follow on Discord" className="btn-primary" />
              </div>
            }
          />
        ) : (
          <>
            <section className="rounded-card border border-white/[0.08] bg-bg-card p-4">
              <form method="get" className="grid gap-3 xl:grid-cols-[1.2fr,0.8fr,auto]">
                <input
                  name="q"
                  defaultValue={queryValue}
                  className="input-esports h-11"
                  placeholder="Search stories, tags, or topics"
                />
                <select name="category" defaultValue={category} className="input-esports h-11">
                  <option value="all">All categories</option>
                  {categories.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
                <div className="flex items-end gap-2">
                  <button type="submit" className="btn-primary h-11">
                    Apply
                  </button>
                  <Link href="/news" className="btn-secondary h-11">
                    Reset
                  </Link>
                </div>
              </form>
            </section>

            <section className="grid gap-4 xl:grid-cols-2">
              {filteredArticles.map((article) => (
                <NewsCard key={article.id} article={article} />
              ))}
              {filteredArticles.length === 0 ? (
                <div className="xl:col-span-2">
                  <EmptyState
                    title="No stories match this filter"
                    description="Try a different keyword or open all categories to browse the current public news feed."
                  />
                </div>
              ) : null}
            </section>
          </>
        )}
      </div>
    </main>
  );
}

export function NewsArticlePage({
  hub,
  article,
}: {
  hub: PlatformHubData;
  article: PlatformArticle;
}) {
  const relatedArticles = article.relatedSlugs
    .map((slug) => hub.news.find((candidate) => candidate.slug === slug) ?? null)
    .filter((candidate): candidate is PlatformArticle => Boolean(candidate))
    .slice(0, 3);
  const bodyParagraphs = article.body.length > 0 ? article.body : [buildArticleSummary(article)];
  const publishedLabel = formatDisplayDateTime(article.publishedAt ?? article.date);

  return (
    <main className="page-shell pb-12 pt-6">
      <div className="page-stack">
        <PageHero
          badge={article.category}
          title={article.title}
          description={buildArticleSummary(article)}
          actions={
            <>
              <Link href="/news" className="btn-secondary">
                Back to News
              </Link>
              <Link href="/events" className="btn-primary">
                Explore Events
              </Link>
            </>
          }
          stats={[
            { label: "Published", value: publishedLabel, tone: "blue" },
            { label: "Author", value: article.authorName, tone: "green" },
            { label: "Category", value: article.category, tone: "yellow" },
            { label: "Tags", value: article.tags.length, tone: "red" },
          ]}
        />

        <ArticleUtilityBar article={article} />

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr),340px]">
          <article className="esports-card p-6 sm:p-8">
            {article.imageUrl ? (
              <ManagedImage
                src={article.imageUrl}
                alt={article.title}
                priority
                sizes="(min-width: 1280px) 960px, 100vw"
                wrapperClassName="mb-6 h-72 rounded-card border border-white/[0.08] sm:h-[26rem]"
                className="object-cover"
              />
            ) : null}

            <div className="flex flex-wrap items-center gap-2">
              <CategoryPill label={article.category} />
              {article.tags.map((tag) => (
                <CategoryPill key={tag} label={tag} />
              ))}
            </div>

            <div className="mt-6 rounded-card border border-white/[0.08] bg-bg-primary p-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-muted">Author</p>
                  <p className="mt-2 text-sm text-white">{article.authorName}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-muted">Published</p>
                  <p className="mt-2 text-sm text-white">{publishedLabel}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-muted">Story Type</p>
                  <p className="mt-2 text-sm text-white">{article.breaking ? "Breaking update" : "Published article"}</p>
                </div>
              </div>
            </div>

            <div className="mt-8 space-y-5 text-base leading-8 text-slate-200">
              {bodyParagraphs.map((paragraph, index) => (
                <p key={`${article.id}-${index}`}>{paragraph}</p>
              ))}
            </div>
          </article>

          <aside className="space-y-6">
            <section className="esports-card p-6">
              <SectionHeader
                eyebrow="Story Snapshot"
                title="At a glance"
                description="Key public metadata stays visible without forcing readers to scroll back to the top."
              />
              <div className="mt-5 space-y-3">
                <div className="rounded-card border border-white/[0.08] bg-bg-primary px-4 py-3 text-sm text-white">
                  {buildArticleSummary(article)}
                </div>
                {article.gameSlug ? (
                  <div className="rounded-card border border-white/[0.08] bg-bg-primary px-4 py-3 text-sm text-white">
                    Game tag: {article.gameSlug}
                  </div>
                ) : null}
              </div>
            </section>

            <section className="esports-card p-6">
              <SectionHeader
                eyebrow="Next Steps"
                title="Keep exploring"
                description="Readers can jump straight into current events, results, or the full news index."
              />
              <div className="mt-5 grid gap-3">
                {[
                  { href: "/news", label: "Open news hub", detail: "Browse all published stories and updates." },
                  { href: "/events", label: "View events", detail: "See the live and upcoming public event board." },
                  { href: "/media", label: "Media center", detail: "Watch published video coverage and clips." },
                ].map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="rounded-card border border-white/[0.08] bg-bg-primary px-4 py-3 transition hover:border-accent-green/25 hover:bg-bg-hover"
                  >
                    <p className="font-semibold text-white">{item.label}</p>
                    <p className="mt-1 text-sm text-text-muted">{item.detail}</p>
                  </Link>
                ))}
              </div>
            </section>
          </aside>
        </section>

        <section className="esports-card p-6">
          <SectionHeader
            eyebrow="Related Stories"
            title="Keep reading"
            description="Only real published content is linked here, so readers never hit draft or scheduled pages."
          />
          <div className="mt-6 grid gap-4 xl:grid-cols-3">
            {relatedArticles.map((relatedArticle) => (
              <NewsCard key={relatedArticle.id} article={relatedArticle} />
            ))}
            {relatedArticles.length === 0 ? (
              <div className="xl:col-span-3">
                <EmptyState
                  title="No related stories are available yet"
                  description="Browse the full news hub to keep up with the latest public Bravo coverage."
                  action={
                    <Link href={buildHref("/news", { category: article.category })} className="btn-secondary">
                      Browse News
                    </Link>
                  }
                />
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}
