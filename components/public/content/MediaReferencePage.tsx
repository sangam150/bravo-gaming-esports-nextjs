import {
  PublicActionLink,
  PublicCommunityCta,
  PublicEmptyState,
  PublicInlineLink,
  PublicPageHero,
  PublicSectionHeader,
  PublicStatusBadge,
  joinClasses,
  readSearchParam,
  type SearchParamDictionary,
} from "@/components/public/PublicDesignSystem";
import ManagedImage from "@/components/ui/ManagedImage";
import { BRAVO_YOUTUBE_URL } from "@/lib/brand-links";
import type { PlatformHubData, PlatformMediaItem } from "@/lib/platform-hub";
import { CirclePlay } from "lucide-react";
import Link from "next/link";
import {
  ChannelLinks,
  dateValue,
  FilterTabs,
  isCompatibilityFallback,
  normalizePage,
  PaginationNav,
} from "./ContentPageShared";

const MEDIA_PAGE_SIZE = 8;

function mediaCategoryKey(item: PlatformMediaItem) {
  return `${item.category} ${item.kind}`.toLowerCase();
}

function mediaMatchesCategory(item: PlatformMediaItem, category: string) {
  if (category === "all") return true;
  const key = mediaCategoryKey(item);
  const terms: Record<string, string[]> = {
    highlights: ["highlight"],
    broadcasts: ["broadcast", "vod", "stream"],
    interviews: ["interview"],
    clips: ["clip", "short"],
  };
  return (terms[category] ?? [category]).some((term) => key.includes(term));
}

function sortMedia(items: PlatformMediaItem[], sort: string) {
  const nextItems = [...items];
  if (sort === "oldest") {
    return nextItems.sort(
      (first, second) =>
        dateValue(first.publishedAt ?? first.updatedAt) - dateValue(second.publishedAt ?? second.updatedAt),
    );
  }
  if (sort === "title") {
    return nextItems.sort((first, second) => first.title.localeCompare(second.title));
  }
  return nextItems.sort(
    (first, second) =>
      dateValue(second.publishedAt ?? second.updatedAt) - dateValue(first.publishedAt ?? first.updatedAt),
  );
}

function MediaVisual({
  item,
  className,
  priority = false,
}: {
  item: PlatformMediaItem;
  className: string;
  priority?: boolean;
}) {
  if (item.imageUrl) {
    return (
      <ManagedImage
        src={item.imageUrl}
        alt={item.title}
        priority={priority}
        sizes="(min-width: 1280px) 45vw, (min-width: 768px) 50vw, 100vw"
        wrapperClassName={className}
        className="object-cover"
      />
    );
  }
  return (
    <div
      className={joinClasses(
        className,
        "relative bg-[radial-gradient(circle_at_25%_20%,rgba(8,102,255,0.22),transparent_36%),linear-gradient(145deg,#081522,#020812)]",
      )}
      role="img"
      aria-label={`${item.title} has no published thumbnail`}
    >
      <CirclePlay className="absolute bottom-5 right-5 h-14 w-14 text-white/15" aria-hidden="true" />
    </div>
  );
}

function FeaturedMedia({ item }: { item: PlatformMediaItem }) {
  return (
    <article className="public-card overflow-hidden">
      <MediaVisual item={item} priority className="h-48 w-full sm:h-56" />
      <div className="p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <PublicStatusBadge tone="blue">{item.kind || item.category}</PublicStatusBadge>
          {item.duration ? <span className="text-xs text-text-secondary">{item.duration}</span> : null}
        </div>
        <h2 className="mt-3 line-clamp-2 font-display text-2xl font-bold uppercase leading-tight text-white">
          {item.title}
        </h2>
        <p className="mt-3 line-clamp-2 text-sm leading-6 text-text-secondary">{item.summary}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <PublicActionLink href={`/media/${item.slug}`}>View Details</PublicActionLink>
          {item.url ? (
            <PublicActionLink href={item.url} variant="secondary" externalLabel=" opens in a new tab">
              Open Media
            </PublicActionLink>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function MediaCard({ item }: { item: PlatformMediaItem }) {
  return (
    <article className="public-card flex min-w-0 flex-col overflow-hidden">
      <div className="relative">
        <MediaVisual item={item} className="h-40 w-full" />
        <div className="absolute left-3 top-3">
          <PublicStatusBadge tone={item.kind.toLowerCase().includes("interview") ? "purple" : "blue"}>
            {item.kind || item.category}
          </PublicStatusBadge>
        </div>
        {item.duration ? (
          <span className="absolute bottom-2 right-2 rounded-[3px] bg-black/80 px-2 py-1 text-[11px] text-white">
            {item.duration}
          </span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="line-clamp-2 font-display text-xl font-bold leading-tight text-white">{item.title}</h3>
        <p className="mt-3 line-clamp-3 text-sm leading-6 text-text-muted">{item.summary}</p>
        <div className="mt-auto flex gap-2 pt-5">
          <PublicActionLink href={`/media/${item.slug}`} className="flex-1 justify-center">
            Watch Details
          </PublicActionLink>
          {item.url ? (
            <PublicActionLink
              href={item.url}
              variant="secondary"
              className="!px-3"
              externalLabel=" opens in a new tab"
            >
              <span className="sr-only">Open {item.title}</span>
            </PublicActionLink>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export function MediaReferencePage({
  hub,
  searchParams,
}: {
  hub: PlatformHubData;
  searchParams: SearchParamDictionary;
}) {
  const publishedMedia = hub.media.filter((item) => !isCompatibilityFallback(item.id));
  const categoryValue = readSearchParam(searchParams.category, "all").toLowerCase();
  const category = ["all", "highlights", "broadcasts", "interviews", "clips"].includes(categoryValue)
    ? categoryValue
    : "all";
  const sortValue = readSearchParam(searchParams.sort, "recent").toLowerCase();
  const sort = ["recent", "oldest", "title"].includes(sortValue) ? sortValue : "recent";
  const filteredMedia = sortMedia(
    publishedMedia.filter((item) => mediaMatchesCategory(item, category)),
    sort,
  );
  const totalPages = Math.max(1, Math.ceil(filteredMedia.length / MEDIA_PAGE_SIZE));
  const page = normalizePage(searchParams.page, totalPages);
  const pageItems = filteredMedia.slice((page - 1) * MEDIA_PAGE_SIZE, page * MEDIA_PAGE_SIZE);
  const featuredMedia = publishedMedia.find((item) => item.featured) ?? publishedMedia[0] ?? null;
  const recentMedia = sortMedia(publishedMedia, "recent").slice(0, 5);

  return (
    <main className="public-page">
      <PublicPageHero
        eyebrow="Home / Media Center"
        title="Media Center"
        description="Watch published Bravo broadcasts, highlights, interviews, and clips from official competition coverage."
        actions={
          <>
            {featuredMedia ? (
              <PublicActionLink href={featuredMedia.url ?? `/media/${featuredMedia.slug}`}>
                <CirclePlay className="h-4 w-4" aria-hidden="true" />
                View Featured
              </PublicActionLink>
            ) : (
              <PublicActionLink href={BRAVO_YOUTUBE_URL}>
                <CirclePlay className="h-4 w-4" aria-hidden="true" />
                Visit Broadcast Channel
              </PublicActionLink>
            )}
            <PublicActionLink href="#media-library" variant="secondary">
              Browse All Content
            </PublicActionLink>
          </>
        }
        aside={
          featuredMedia ? (
            <FeaturedMedia item={featuredMedia} />
          ) : (
            <PublicEmptyState
              compact
              title="No published media yet"
              description="A featured player appears only after Bravo publishes a real media item."
            />
          )
        }
      >
        <div className="flex flex-wrap items-center gap-4">
          <span className="public-stat-label">Follow official channels</span>
          <ChannelLinks />
        </div>
      </PublicPageHero>

      <div className="public-container space-y-7 py-6">
        <section id="media-library" className="scroll-mt-24 space-y-5">
          <div className="public-panel p-3 sm:p-4">
            <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_12rem] xl:items-center">
              <FilterTabs
                pathname="/media"
                searchParams={searchParams}
                paramName="category"
                activeValue={category}
                label="Filter media by category"
                items={[
                  { label: "All Content", value: "all" },
                  { label: "Highlights", value: "highlights" },
                  { label: "Broadcasts", value: "broadcasts" },
                  { label: "Interviews", value: "interviews" },
                  { label: "Clips", value: "clips" },
                ]}
              />
              <form action="/media" method="get" className="flex gap-2">
                {category !== "all" ? <input type="hidden" name="category" value={category} /> : null}
                <label className="min-w-0 flex-1">
                  <span className="sr-only">Sort media</span>
                  <select name="sort" defaultValue={sort} className="public-filter-control min-h-10 w-full">
                    <option value="recent">Most recent</option>
                    <option value="oldest">Oldest first</option>
                    <option value="title">Title</option>
                  </select>
                </label>
                <button type="submit" className="btn-secondary min-h-10 !px-3 !py-2">
                  Apply
                </button>
              </form>
            </div>
          </div>

          <PublicSectionHeader
            eyebrow="Published Media"
            title="Browse Content"
            action={<span className="text-xs text-text-muted">{filteredMedia.length} item(s)</span>}
          />

          {pageItems.length > 0 ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {pageItems.map((item) => (
                  <MediaCard key={item.id} item={item} />
                ))}
              </div>
              <PaginationNav
                pathname="/media"
                searchParams={searchParams}
                currentPage={page}
                totalPages={totalPages}
              />
            </>
          ) : (
            <PublicEmptyState
              title={publishedMedia.length === 0 ? "No published media yet" : "No media matches this category"}
              description={
                publishedMedia.length === 0
                  ? "Approved broadcasts, highlights, interviews, and clips will appear here after publication."
                  : "Choose another category or sorting option to browse the current media library."
              }
              action={
                <PublicActionLink href={BRAVO_YOUTUBE_URL} variant="secondary">
                  Official YouTube Channel
                </PublicActionLink>
              }
            />
          )}
        </section>

        <section className="space-y-4">
          <PublicSectionHeader
            eyebrow="Recent Uploads"
            title="Latest Published Content"
            action={
              publishedMedia.length > 5 ? (
                <PublicInlineLink href="/media#media-library">View all media</PublicInlineLink>
              ) : null
            }
          />
          {recentMedia.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {recentMedia.map((item) => (
                <Link
                  key={item.id}
                  href={`/media/${item.slug}`}
                  className="public-card group min-w-0 overflow-hidden transition hover:border-accent-blue/45"
                >
                  <MediaVisual item={item} className="h-28 w-full" />
                  <div className="p-3">
                    <p className="line-clamp-2 text-sm font-semibold leading-5 text-white group-hover:text-accent-blue-light">
                      {item.title}
                    </p>
                    <div className="mt-2 flex items-center justify-between gap-2 text-[10px] uppercase tracking-[0.05em] text-text-muted">
                      <span>{item.category}</span>
                      {item.duration ? <span>{item.duration}</span> : null}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <PublicEmptyState
              compact
              title="Recent uploads will appear here"
              description="This row remains empty until real media records are published."
            />
          )}
        </section>

        <PublicCommunityCta
          title="Follow Nepal’s PUBG PC esports coverage"
          description="Join Discord for stream announcements, published highlights, and official event updates."
          showRegister={false}
        />
      </div>
    </main>
  );
}
