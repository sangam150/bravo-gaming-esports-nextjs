import { getSiteUrl } from "./site";

type BreadcrumbItem = {
  name: string;
  path: string;
};

type PublicEventStructuredDataInput = {
  bannerUrl?: string | null;
  endDate?: string | null;
  lifecycle?: string | null;
  name: string;
  organizerName?: string | null;
  path?: string;
  region?: string | null;
  slug: string;
  startDate?: string | null;
  summary?: string | null;
};

type ArticleStructuredDataInput = {
  authorName?: string | null;
  canonicalUrl?: string | null;
  category?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  modifiedAt?: string | null;
  path: string;
  publishedAt?: string | null;
  tags?: readonly string[];
  title: string;
};

function resolveAbsoluteSiteUrl(pathOrUrl: string) {
  try {
    const resolvedUrl = new URL(pathOrUrl, getSiteUrl());
    return resolvedUrl.protocol === "https:" || resolvedUrl.protocol === "http:" ? resolvedUrl.toString() : undefined;
  } catch {
    return undefined;
  }
}

function absoluteSiteUrl(pathOrUrl: string) {
  return resolveAbsoluteSiteUrl(pathOrUrl) ?? getSiteUrl();
}

export function buildBreadcrumbStructuredData(items: readonly BreadcrumbItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteSiteUrl(item.path),
    })),
  };
}

function normalizeStructuredDate(value?: string | null) {
  if (!value) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}

function resolveSchemaEventStatus(lifecycle?: string | null) {
  switch (lifecycle?.trim().toLowerCase()) {
    case "cancelled":
      return "https://schema.org/EventCancelled";
    case "completed":
    case "archived":
      return "https://schema.org/EventCompleted";
    default:
      return "https://schema.org/EventScheduled";
  }
}

export function buildPublicEventStructuredData(event: PublicEventStructuredDataInput) {
  const eventUrl = absoluteSiteUrl(event.path || `/events/${event.slug}`);
  const startDate = normalizeStructuredDate(event.startDate);
  const endDate = normalizeStructuredDate(event.endDate);
  const imageUrl = event.bannerUrl ? resolveAbsoluteSiteUrl(event.bannerUrl) : undefined;
  const summary = event.summary?.trim();
  const organizerName = event.organizerName?.trim() || "Bravo Gaming Esports";

  return {
    "@context": "https://schema.org",
    "@type": "SportsEvent",
    name: event.name,
    url: eventUrl,
    mainEntityOfPage: eventUrl,
    eventStatus: resolveSchemaEventStatus(event.lifecycle),
    ...(summary ? { description: summary } : {}),
    ...(startDate ? { startDate } : {}),
    ...(endDate ? { endDate } : {}),
    ...(imageUrl ? { image: [imageUrl] } : {}),
    ...(event.region
      ? {
          location: {
            "@type": "Place",
            name: event.region,
          },
        }
      : {}),
    organizer: {
      "@type": "Organization",
      name: organizerName,
      ...(organizerName === "Bravo Gaming Esports" ? { url: getSiteUrl() } : {}),
    },
  };
}

export function buildArticleStructuredData(article: ArticleStructuredDataInput) {
  const canonicalUrl = absoluteSiteUrl(article.canonicalUrl || article.path);
  const imageUrl = resolveAbsoluteSiteUrl(article.imageUrl || "/images/bravo-logo.png") ?? absoluteSiteUrl("/images/bravo-logo.png");
  const publishedAt = normalizeStructuredDate(article.publishedAt);
  const modifiedAt = normalizeStructuredDate(article.modifiedAt);
  const description = article.description?.trim();
  const authorName = article.authorName?.trim();
  const category = article.category?.trim();
  const tags = article.tags?.map((tag) => tag.trim()).filter(Boolean) ?? [];

  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    mainEntityOfPage: canonicalUrl,
    image: [imageUrl],
    ...(description ? { description } : {}),
    ...(publishedAt ? { datePublished: publishedAt } : {}),
    ...(modifiedAt ? { dateModified: modifiedAt } : {}),
    ...(category ? { articleSection: category } : {}),
    ...(tags.length > 0 ? { keywords: tags } : {}),
    ...(authorName
      ? {
          author: {
            "@type": "Person",
            name: authorName,
          },
        }
      : {}),
    publisher: {
      "@type": "Organization",
      name: "Bravo Gaming Esports",
      url: getSiteUrl(),
      logo: {
        "@type": "ImageObject",
        url: absoluteSiteUrl("/images/bravo-logo.png"),
      },
    },
  };
}
