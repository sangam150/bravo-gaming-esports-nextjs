import { randomUUID } from "crypto";
import { nepalDateTimeLocalToUtcIso } from "./nepal-datetime";
import { BRAVO_DISCORD_URL, BRAVO_INSTAGRAM_URL } from "./brand-links";
import { ensureUniqueDocumentSlug, filterSoftDeleted, getDocumentByIdOrSlug, softDeleteDocumentEntity } from "./document-entities";
import { COLLECTIONS, fetchDocumentCollection, getDocument, isDocumentStoreConfigured, saveDocument } from "./document-store";
import {
  getManagedNewsSortValue,
  isManagedNewsArticlePublic,
  normalizeNewsDateTime,
  resolveManagedNewsEffectiveState,
  type ManagedNewsStateValue,
} from "./news-publishing";
import { normalizePublicActionHref } from "./public-links";
import { slugify } from "./slug-utils";

type ManagedNewsState = ManagedNewsStateValue;

export interface HomepageHeroSlideRecord {
  id: string;
  badge: string;
  title: string;
  description: string;
  imageUrl?: string;
  videoUrl?: string;
  sponsorSlug?: string;
  promoText?: string;
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel?: string;
  secondaryHref?: string;
  tertiaryLabel?: string;
  tertiaryHref?: string;
}

export type HomepageEventFeatureMode = "auto" | "details" | "registration" | "stream";

export interface HomepageFeaturedEventRecord {
  eventSlug: string;
  priority: number;
  activeFrom?: string;
  activeUntil?: string;
  label?: string;
  mode: HomepageEventFeatureMode;
  ctaLabel?: string;
  ctaHref?: string;
  primary: boolean;
}

export interface FooterLinkRecord {
  label: string;
  href: string;
}

interface FooterColumnRecord {
  id: string;
  title: string;
  links: FooterLinkRecord[];
}

interface FooterHighlightRecord {
  id: string;
  label: string;
  value: string;
}

export interface HomepageContentRecord {
  id: string;
  heroSlides: HomepageHeroSlideRecord[];
  breakingNewsSlug?: string;
  featuredNewsSlugs: string[];
  featuredEventSlugs: string[];
  featuredEvents: HomepageFeaturedEventRecord[];
  featuredSponsorSlugs: string[];
  featuredMediaIds: string[];
  featuredTeamIds: string[];
  featuredPlayerIds: string[];
  liveTitle?: string;
  liveSubtitle?: string;
  liveViewers?: string;
  liveHref?: string;
  footerTitle: string;
  footerTagline: string;
  footerDescription: string;
  footerPrimaryLabel: string;
  footerPrimaryHref: string;
  footerSecondaryLabel: string;
  footerSecondaryHref: string;
  footerColumns: FooterColumnRecord[];
  footerHighlights: FooterHighlightRecord[];
  footerBottomPrimary: string;
  footerBottomSecondary: string;
  updatedAt?: string;
}

export interface ManagedNewsArticleRecord {
  id: string;
  slug: string;
  title: string;
  summary: string;
  excerpt?: string;
  body: string[];
  date: string;
  category: string;
  tags: string[];
  authorName: string;
  gameSlug?: string;
  featured: boolean;
  breaking: boolean;
  state: ManagedNewsState;
  imageUrl?: string;
  seoTitle?: string;
  seoDescription?: string;
  ogImageUrl?: string;
  canonicalUrl?: string;
  publishAt?: string;
  publishedAt?: string;
  deletedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

const LEGACY_HREF_MAP: Record<string, string> = {
  "https://kamaucha.me/bravo": BRAVO_DISCORD_URL,
  "/admin": "/login",
  "/community": "/pubg/community",
  "/games": "/pubg",
  "/partners": "/sponsors",
  "/players": "/pubg/players",
  "/team": "/login",
  "/teams": "/pubg/teams",
  "/videos": "/media",
};

const DEFAULT_HOMEPAGE_CONTENT: HomepageContentRecord = {
  id: "main",
  heroSlides: [
    {
      id: "platform-home",
      badge: "Nepal Esports Platform",
      title: "Published matches, rankings, news, and events in one home",
      description:
        "Bravo Gaming Esports brings together real match coverage, verified standings, news, and community updates for Nepal esports.",
      primaryLabel: "Watch Live",
      primaryHref: "/live-stream",
      secondaryLabel: "Explore Events",
      secondaryHref: "/events",
      tertiaryLabel: "Join Community",
      tertiaryHref: BRAVO_DISCORD_URL,
    },
    {
      id: "pubg-flagship",
      badge: "Flagship PUBG Coverage",
      title: "PUBG PC remains the flagship competitive hub",
      description: "Browse published seasons, events, teams, players, matches, and standings from approved results.",
      primaryLabel: "Open PUBG",
      primaryHref: "/pubg",
      secondaryLabel: "Leaderboards",
      secondaryHref: "/pubg/leaderboards",
      tertiaryLabel: "Latest Results",
      tertiaryHref: "/pubg/results",
    },
    {
      id: "ecosystem-growth",
      badge: "Sponsors, Media, and Community",
      title: "Sponsors, media, and community stay connected",
      description:
        "Sponsor profiles, media coverage, and community touchpoints stay aligned with official Bravo updates as content goes live.",
      primaryLabel: "Open Community",
      primaryHref: "/pubg/community",
      secondaryLabel: "Read News",
      secondaryHref: "/news",
      tertiaryLabel: "Sponsor Hub",
      tertiaryHref: "/sponsors",
    },
  ],
  featuredNewsSlugs: [],
  featuredEventSlugs: [],
  featuredEvents: [],
  featuredSponsorSlugs: [],
  featuredMediaIds: [],
  featuredTeamIds: [],
  featuredPlayerIds: [],
  liveTitle: "Bravo Gaming Esports Live Feed",
  liveSubtitle: "Published broadcasts and live coverage will appear here when a verified stream is active.",
  liveViewers: undefined,
  liveHref: "/live-stream",
  footerTitle: "Bravo Gaming Esports",
  footerTagline: "Nepal Esports Platform",
  footerDescription:
    "Bravo Gaming Esports is building a clean, trustworthy home for Nepal esports with published match data, verified standings, and community-first coverage.",
  footerPrimaryLabel: "Watch Live",
  footerPrimaryHref: "/live-stream",
  footerSecondaryLabel: "Join Discord",
  footerSecondaryHref: BRAVO_DISCORD_URL,
  footerColumns: [
    {
      id: "footer-main",
      title: "Main",
      links: [
        { label: "Home", href: "/" },
        { label: "PUBG", href: "/pubg" },
        { label: "Events", href: "/events" },
        { label: "Community", href: "/pubg/community" },
        { label: "Media", href: "/media" },
        { label: "News", href: "/news" },
      ],
    },
    {
      id: "footer-discover",
      title: "Discover",
      links: [
        { label: "Leaderboards", href: "/pubg/leaderboards" },
        { label: "Teams", href: "/pubg/teams" },
        { label: "Players", href: "/pubg/players" },
        { label: "Search", href: "/search" },
        { label: "Watch Live", href: "/live-stream" },
      ],
    },
    {
      id: "footer-community",
      title: "Community",
      links: [
        { label: "Sponsors", href: "/sponsors" },
        { label: "About", href: "/about" },
        { label: "Contact", href: "/contact" },
        { label: "Instagram", href: BRAVO_INSTAGRAM_URL },
        { label: "Discord", href: BRAVO_DISCORD_URL },
      ],
    },
    {
      id: "footer-platform",
      title: "Platform",
      links: [
        { label: "Login", href: "/login" },
        { label: "Privacy", href: "/privacy" },
        { label: "Terms", href: "/terms" },
      ],
    },
  ],
  footerHighlights: [
    { id: "footer-highlight-flagship", label: "Flagship", value: "PUBG" },
    {
      id: "footer-highlight-coverage",
      label: "Coverage",
      value: "News + Results",
    },
    {
      id: "footer-highlight-community",
      label: "Community",
      value: "Nepal Focused",
    },
  ],
  footerBottomPrimary: "Copyright 2026 Bravo Gaming Esports Nepal",
  footerBottomSecondary: "Published events, results, rankings, media, sponsors, and community coverage for Nepal esports.",
};

function normalizeHomepageHref(value?: string | null) {
  const normalizedValue = value?.trim();
  if (!normalizedValue) {
    return undefined;
  }

  return normalizePublicActionHref(LEGACY_HREF_MAP[normalizedValue] ?? normalizedValue);
}

function normalizeHomepageLabel(label: string, href: string) {
  if (label === "Games" && href === "/pubg") return "PUBG";
  if (label === "Admin" && href === "/login") return "Login";
  if (label === "Team Login" && href === "/login") return "Login";
  return label;
}

function cleanString(value?: string | null) {
  const normalizedValue = value?.trim();
  return normalizedValue ? normalizedValue : undefined;
}

function cleanStringArray(values?: string[] | string | null) {
  const normalizedValues = Array.isArray(values) ? values : typeof values === "string" ? values.split(/[\n,]+/g) : [];

  return Array.from(new Set(normalizedValues.map((value) => value.trim()).filter(Boolean)));
}

function normalizeFeaturedEvent(feature: Partial<HomepageFeaturedEventRecord>, index: number): HomepageFeaturedEventRecord | null {
  const eventSlug = cleanString(feature.eventSlug);
  if (!eventSlug) return null;
  const mode: HomepageEventFeatureMode =
    feature.mode === "details" || feature.mode === "registration" || feature.mode === "stream" ? feature.mode : "auto";

  return {
    eventSlug,
    priority: Number.isFinite(feature.priority) ? Math.max(0, Math.trunc(feature.priority ?? index)) : index,
    activeFrom: nepalDateTimeLocalToUtcIso(feature.activeFrom),
    activeUntil: nepalDateTimeLocalToUtcIso(feature.activeUntil),
    label: cleanString(feature.label),
    mode,
    ctaLabel: cleanString(feature.ctaLabel),
    ctaHref: normalizePublicActionHref(feature.ctaHref),
    primary: Boolean(feature.primary),
  };
}

function normalizeBody(body: string[] | string | null | undefined) {
  const paragraphs = Array.isArray(body) ? body : typeof body === "string" ? body.split(/\n{2,}/g) : [];
  return paragraphs.map((paragraph) => paragraph.trim()).filter(Boolean);
}

function normalizeHeroSlide(slide: Partial<HomepageHeroSlideRecord>, index: number): HomepageHeroSlideRecord {
  return {
    id: cleanString(slide.id) ?? `hero-slide-${index + 1}`,
    badge: cleanString(slide.badge) ?? "Bravo Gaming Esports",
    title: cleanString(slide.title) ?? "Bravo Gaming Esports",
    description: cleanString(slide.description) ?? "",
    imageUrl: cleanString(slide.imageUrl),
    videoUrl: cleanString(slide.videoUrl),
    sponsorSlug: cleanString(slide.sponsorSlug),
    promoText: cleanString(slide.promoText),
    primaryLabel: cleanString(slide.primaryLabel) ?? "Explore",
    primaryHref: normalizeHomepageHref(slide.primaryHref) ?? "/",
    secondaryLabel: cleanString(slide.secondaryLabel),
    secondaryHref: normalizeHomepageHref(slide.secondaryHref),
    tertiaryLabel: cleanString(slide.tertiaryLabel),
    tertiaryHref: normalizeHomepageHref(slide.tertiaryHref),
  };
}

function normalizeFooterLink(link: Partial<FooterLinkRecord>): FooterLinkRecord | null {
  const label = cleanString(link.label);
  const href = normalizeHomepageHref(link.href);

  if (!label || !href) {
    return null;
  }

  return {
    label: normalizeHomepageLabel(label, href),
    href,
  };
}

function normalizeFooterColumn(column: Partial<FooterColumnRecord>, index: number): FooterColumnRecord {
  const fallbackColumn = DEFAULT_HOMEPAGE_CONTENT.footerColumns[index] ?? DEFAULT_HOMEPAGE_CONTENT.footerColumns[0];
  const links = Array.isArray(column.links)
    ? column.links.map((link) => normalizeFooterLink(link)).filter((link): link is FooterLinkRecord => Boolean(link))
    : [];

  return {
    id: cleanString(column.id) ?? fallbackColumn.id,
    title: cleanString(column.title) ?? fallbackColumn.title,
    links: links.length > 0 ? links : fallbackColumn.links,
  };
}

function normalizeFooterHighlight(highlight: Partial<FooterHighlightRecord>, index: number): FooterHighlightRecord {
  const fallbackHighlight = DEFAULT_HOMEPAGE_CONTENT.footerHighlights[index] ?? DEFAULT_HOMEPAGE_CONTENT.footerHighlights[0];

  return {
    id: cleanString(highlight.id) ?? fallbackHighlight.id,
    label: cleanString(highlight.label) ?? fallbackHighlight.label,
    value: cleanString(highlight.value) ?? fallbackHighlight.value,
  };
}

function normalizeHomepageContent(data?: Partial<HomepageContentRecord> | null): HomepageContentRecord {
  const heroSlidesInput =
    Array.isArray(data?.heroSlides) && data.heroSlides.length > 0 ? data.heroSlides : DEFAULT_HOMEPAGE_CONTENT.heroSlides;
  const footerColumnsInput =
    Array.isArray(data?.footerColumns) && data.footerColumns.length > 0 ? data.footerColumns : DEFAULT_HOMEPAGE_CONTENT.footerColumns;
  const footerHighlightsInput =
    Array.isArray(data?.footerHighlights) && data.footerHighlights.length > 0
      ? data.footerHighlights
      : DEFAULT_HOMEPAGE_CONTENT.footerHighlights;
  const legacyFeaturedEventSlugs = cleanStringArray(data?.featuredEventSlugs);
  const normalizedFeaturedEventRows =
    Array.isArray(data?.featuredEvents) && data.featuredEvents.length > 0
      ? data.featuredEvents
          .map((feature, index) => normalizeFeaturedEvent(feature, index))
          .filter((feature): feature is HomepageFeaturedEventRecord => feature !== null)
      : legacyFeaturedEventSlugs.map((eventSlug, index) => ({
          eventSlug,
          priority: index,
          mode: "auto" as const,
          primary: index === 0,
        }));
  const seenFeaturedEventSlugs = new Set<string>();
  const uniqueFeaturedEvents = normalizedFeaturedEventRows.filter((feature) => {
    if (seenFeaturedEventSlugs.has(feature.eventSlug)) return false;
    seenFeaturedEventSlugs.add(feature.eventSlug);
    return true;
  });
  const primaryFeatureIndex = Math.max(
    0,
    uniqueFeaturedEvents.findIndex((feature) => feature.primary),
  );
  const normalizedFeaturedEvents = uniqueFeaturedEvents.map((feature, index) => ({
    ...feature,
    primary: index === primaryFeatureIndex,
  }));

  return {
    id: "main",
    heroSlides: heroSlidesInput.slice(0, 3).map((slide, index) => normalizeHeroSlide(slide, index)),
    breakingNewsSlug: cleanString(data?.breakingNewsSlug),
    featuredNewsSlugs: cleanStringArray(data?.featuredNewsSlugs),
    featuredEventSlugs:
      normalizedFeaturedEvents.length > 0 ? normalizedFeaturedEvents.map((feature) => feature.eventSlug) : legacyFeaturedEventSlugs,
    featuredEvents: normalizedFeaturedEvents,
    featuredSponsorSlugs: cleanStringArray(data?.featuredSponsorSlugs),
    featuredMediaIds: cleanStringArray(data?.featuredMediaIds),
    featuredTeamIds: cleanStringArray(data?.featuredTeamIds),
    featuredPlayerIds: cleanStringArray(data?.featuredPlayerIds),
    liveTitle: cleanString(data?.liveTitle),
    liveSubtitle: cleanString(data?.liveSubtitle),
    liveViewers: cleanString(data?.liveViewers),
    liveHref: normalizePublicActionHref(data?.liveHref),
    footerTitle: cleanString(data?.footerTitle) ?? DEFAULT_HOMEPAGE_CONTENT.footerTitle,
    footerTagline: cleanString(data?.footerTagline) ?? DEFAULT_HOMEPAGE_CONTENT.footerTagline,
    footerDescription: cleanString(data?.footerDescription) ?? DEFAULT_HOMEPAGE_CONTENT.footerDescription,
    footerPrimaryLabel: cleanString(data?.footerPrimaryLabel) ?? DEFAULT_HOMEPAGE_CONTENT.footerPrimaryLabel,
    footerPrimaryHref: normalizeHomepageHref(data?.footerPrimaryHref) ?? DEFAULT_HOMEPAGE_CONTENT.footerPrimaryHref,
    footerSecondaryLabel: cleanString(data?.footerSecondaryLabel) ?? DEFAULT_HOMEPAGE_CONTENT.footerSecondaryLabel,
    footerSecondaryHref: normalizeHomepageHref(data?.footerSecondaryHref) ?? DEFAULT_HOMEPAGE_CONTENT.footerSecondaryHref,
    footerColumns: footerColumnsInput.slice(0, 4).map((column, index) => normalizeFooterColumn(column, index)),
    footerHighlights: footerHighlightsInput.slice(0, 3).map((highlight, index) => normalizeFooterHighlight(highlight, index)),
    footerBottomPrimary: cleanString(data?.footerBottomPrimary) ?? DEFAULT_HOMEPAGE_CONTENT.footerBottomPrimary,
    footerBottomSecondary: cleanString(data?.footerBottomSecondary) ?? DEFAULT_HOMEPAGE_CONTENT.footerBottomSecondary,
    updatedAt: cleanString(data?.updatedAt) ?? new Date().toISOString(),
  };
}

function normalizeManagedNewsArticle(
  data: Omit<Partial<ManagedNewsArticleRecord>, "body"> & {
    title: string;
    summary: string;
    body?: string[] | string;
  },
): ManagedNewsArticleRecord {
  const now = new Date().toISOString();
  const title = data.title.trim();
  const publishAt = normalizeNewsDateTime(data.publishAt);
  const createdAt = cleanString(data.createdAt) ?? now;
  const updatedAt = cleanString(data.updatedAt) ?? createdAt;
  const nextState = resolveManagedNewsEffectiveState({ state: data.state, publishAt }, new Date(now));
  const storedState =
    data.state === "scheduled" && publishAt
      ? "scheduled"
      : data.state === "scheduled"
        ? "draft"
        : data.state === "draft"
          ? "draft"
          : "published";
  const publishedAt =
    normalizeNewsDateTime(data.publishedAt) ??
    (storedState === "published"
      ? publishAt && Date.parse(publishAt) <= Date.parse(now)
        ? publishAt
        : (normalizeNewsDateTime(data.updatedAt) ?? normalizeNewsDateTime(data.date) ?? now)
      : nextState === "published"
        ? publishAt
        : undefined);

  return {
    id: cleanString(data.id) ?? randomUUID(),
    slug: cleanString(data.slug) ?? slugify(title),
    title,
    summary: data.summary.trim(),
    excerpt: cleanString(data.excerpt),
    body: normalizeBody(data.body),
    date: cleanString(data.date) ?? now.slice(0, 10),
    category: cleanString(data.category) ?? "Bravo Gaming",
    tags: cleanStringArray(data.tags),
    authorName: cleanString(data.authorName) ?? "Bravo Editorial Desk",
    gameSlug: cleanString(data.gameSlug),
    featured: Boolean(data.featured),
    breaking: Boolean(data.breaking),
    state: storedState,
    imageUrl: cleanString(data.imageUrl),
    seoTitle: cleanString(data.seoTitle),
    seoDescription: cleanString(data.seoDescription),
    ogImageUrl: normalizePublicActionHref(data.ogImageUrl),
    canonicalUrl: normalizePublicActionHref(data.canonicalUrl),
    publishAt,
    publishedAt,
    deletedAt: cleanString(data.deletedAt),
    createdAt,
    updatedAt,
  };
}

function compareDateDesc(firstValue: { date?: string; updatedAt?: string }, secondValue: { date?: string; updatedAt?: string }) {
  const firstTimestamp = Date.parse(getManagedNewsSortValue(firstValue));
  const secondTimestamp = Date.parse(getManagedNewsSortValue(secondValue));

  if (Number.isFinite(firstTimestamp) && Number.isFinite(secondTimestamp) && firstTimestamp !== secondTimestamp) {
    return secondTimestamp - firstTimestamp;
  }

  return getManagedNewsSortValue(secondValue).localeCompare(getManagedNewsSortValue(firstValue));
}

export async function getHomepageContent(): Promise<HomepageContentRecord> {
  if (!isDocumentStoreConfigured()) {
    return DEFAULT_HOMEPAGE_CONTENT;
  }

  try {
    const storedContent = await getDocument<HomepageContentRecord>(COLLECTIONS.homepageContent, "main");
    return normalizeHomepageContent(storedContent);
  } catch {
    return DEFAULT_HOMEPAGE_CONTENT;
  }
}

export async function saveHomepageContent(data: Partial<HomepageContentRecord>) {
  const payload = normalizeHomepageContent(data);
  await saveDocument(COLLECTIONS.homepageContent, "main", payload as unknown as Record<string, unknown>);
  return payload;
}

export async function getManagedNewsArticles(options: { includeDrafts?: boolean } = {}) {
  if (!isDocumentStoreConfigured()) {
    return [];
  }

  try {
    const articles = await fetchDocumentCollection<ManagedNewsArticleRecord>(COLLECTIONS.newsArticles, 200);
    const normalizedArticles = filterSoftDeleted(
      articles.map((article) =>
        normalizeManagedNewsArticle({
          ...article,
          title: article.title,
          summary: article.summary,
        }),
      ),
    );

    return normalizedArticles.filter((article) => options.includeDrafts || isManagedNewsArticlePublic(article)).sort(compareDateDesc);
  } catch {
    return [];
  }
}

export async function getPublishedManagedNewsArticles() {
  return getManagedNewsArticles({ includeDrafts: false });
}

export async function getManagedNewsArticleById(id: string) {
  if (!isDocumentStoreConfigured()) {
    return null;
  }

  try {
    const article = await getDocumentByIdOrSlug<ManagedNewsArticleRecord & { id: string }>(COLLECTIONS.newsArticles, id);
    if (!article?.title || !article?.summary) {
      return null;
    }

    return normalizeManagedNewsArticle({
      ...article,
      title: article.title,
      summary: article.summary,
    });
  } catch {
    return null;
  }
}

export async function saveManagedNewsArticle(
  data: Omit<Partial<ManagedNewsArticleRecord>, "body"> & {
    title: string;
    summary: string;
    body?: string[] | string;
  },
  id?: string,
) {
  const existingArticle = id ? await getManagedNewsArticleById(id) : null;
  const payload = normalizeManagedNewsArticle({
    ...existingArticle,
    ...data,
    id: id ?? data.id,
    title: data.title,
    summary: data.summary,
  });
  const docId = id ?? payload.id;
  const slug = await ensureUniqueDocumentSlug(COLLECTIONS.newsArticles, payload.slug ?? payload.title, docId, payload.title);
  const now = new Date().toISOString();
  const nextPayload = {
    ...payload,
    slug,
    deletedAt: undefined,
    createdAt: payload.createdAt ?? existingArticle?.createdAt ?? now,
    updatedAt: now,
  };

  await saveDocument(COLLECTIONS.newsArticles, docId, nextPayload as unknown as Record<string, unknown>);
  return { ...nextPayload, id: docId };
}

export async function deleteManagedNewsArticle(id: string) {
  await softDeleteDocumentEntity(COLLECTIONS.newsArticles, id);
  return { id, deleted: true };
}
