import { randomUUID } from "crypto";
import {
  COLLECTIONS,
  fetchDocumentCollection,
  getDocument,
  isDocumentStoreConfigured,
  saveDocument,
} from "./document-store";
import {
  ensureUniqueDocumentSlug,
  filterSoftDeleted,
  getDocumentByIdOrSlug,
  softDeleteDocumentEntity,
} from "./document-entities";
import { slugify } from "./slug-utils";

export type ManagedNewsState = "draft" | "published";

export interface HomepageHeroSlideRecord {
  id: string;
  badge: string;
  title: string;
  description: string;
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel?: string;
  secondaryHref?: string;
  tertiaryLabel?: string;
  tertiaryHref?: string;
}

export interface FooterLinkRecord {
  label: string;
  href: string;
}

export interface FooterColumnRecord {
  id: string;
  title: string;
  links: FooterLinkRecord[];
}

export interface FooterHighlightRecord {
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
  deletedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

const DEFAULT_HOMEPAGE_CONTENT: HomepageContentRecord = {
  id: "main",
  heroSlides: [
    {
      id: "platform-home",
      badge: "Nepal's Premier Esports Platform",
      title: "Daily scrims, major events, news, and rankings in one home",
      description:
        "Follow Bravo Gaming Daily PUBG PC Scrims, PUBG Mahasangram, M8, Team HAKU, N3P, FYB Esports, LTG, and the wider Nepal scene from one premium Bravo platform.",
      primaryLabel: "Watch Live",
      primaryHref: "/live-stream",
      secondaryLabel: "Explore Events",
      secondaryHref: "/events",
      tertiaryLabel: "Join Community",
      tertiaryHref: "https://kamaucha.me/bravo",
    },
    {
      id: "pubg-flagship",
      badge: "Flagship PUBG Coverage",
      title: "PUBG remains the flagship with real team and player coverage",
      description:
        "Bravo's strongest section already tracks events, teams, players, results, leaderboards, compare tools, map splits, and real public data flow.",
      primaryLabel: "Open PUBG",
      primaryHref: "/pubg",
      secondaryLabel: "Leaderboards",
      secondaryHref: "/pubg/leaderboards",
      tertiaryLabel: "Compare",
      tertiaryHref: "/compare",
    },
    {
      id: "ecosystem-growth",
      badge: "Sponsors, Media, and Community",
      title: "Hukut, Gorkhali Roleplay, highlights, and the Nepal community stay in view",
      description:
        "Sponsor campaigns, event posters, highlight drops, and community access live beside the competition data so the platform feels public-facing and broadcast-ready.",
      primaryLabel: "Browse Games",
      primaryHref: "/games",
      secondaryLabel: "Read News",
      secondaryHref: "/news",
      tertiaryLabel: "Sponsor Hub",
      tertiaryHref: "/sponsors",
    },
  ],
  featuredNewsSlugs: [],
  featuredEventSlugs: ["daily-scrims-day-7", "pubg-mahasangram-2026", "daily-scrims-day-8", "monsoon-circuit-open"],
  featuredSponsorSlugs: ["hukut", "gorkhali-roleplay"],
  featuredMediaIds: ["media-poster-mahasangram", "media-clips-bravo-finish", "media-interview-expansion"],
  featuredTeamIds: ["m8", "team-haku", "near-edge-protocol", "fyb-esports", "npl", "lang-tang-gang"],
  featuredPlayerIds: ["m8-tommyvercettio-o", "team-haku-haku-yeti", "near-edge-protocol-n3p-vanta", "fyb-esports-fyb-slice", "npl-npl-saber"],
  liveTitle: "Bravo Gaming Daily PUBG PC Scrims Live Feed",
  liveSubtitle: "Watch published lobbies, featured events, and the current match-center pulse from Bravo Gaming Esports Nepal.",
  liveViewers: "Broadcast scheduled",
  liveHref: "/live-stream",
  footerTitle: "Bravo Gaming Esports",
  footerTagline: "Nepal's Premier Esports Platform",
  footerDescription:
    "Bravo Gaming Esports is building the public home of Nepal esports with flagship PUBG coverage, real match results, sponsor visibility, and community-first access.",
  footerPrimaryLabel: "Watch Live",
  footerPrimaryHref: "/live-stream",
  footerSecondaryLabel: "Join Discord",
  footerSecondaryHref: "https://kamaucha.me/bravo",
  footerColumns: [
    {
      id: "footer-main",
      title: "Main",
      links: [
        { label: "Home", href: "/" },
        { label: "News", href: "/news" },
        { label: "Events", href: "/events" },
        { label: "PUBG", href: "/pubg" },
        { label: "Rankings", href: "/rankings" },
        { label: "Media", href: "/media" },
      ],
    },
    {
      id: "footer-competition",
      title: "Competition",
      links: [
        { label: "Games", href: "/games" },
        { label: "Teams", href: "/teams" },
        { label: "Players", href: "/players" },
        { label: "Matches", href: "/matches" },
        { label: "Calendar", href: "/calendar" },
      ],
    },
    {
      id: "footer-community",
      title: "Community",
      links: [
        { label: "Sponsors", href: "/sponsors" },
        { label: "Community", href: "/community" },
        { label: "About", href: "/about" },
        { label: "Contact", href: "/contact" },
        { label: "Discord", href: "https://kamaucha.me/bravo" },
      ],
    },
    {
      id: "footer-legal",
      title: "Legal",
      links: [
        { label: "Privacy", href: "/privacy" },
        { label: "Terms", href: "/terms" },
        { label: "Admin", href: "/admin" },
        { label: "Team Login", href: "/team" },
      ],
    },
  ],
  footerHighlights: [
    { id: "footer-highlight-flagship", label: "Flagship", value: "PUBG" },
    { id: "footer-highlight-coverage", label: "Coverage", value: "News + Results" },
    { id: "footer-highlight-community", label: "Community", value: "Nepal First" },
  ],
  footerBottomPrimary: "Copyright 2026 Bravo Gaming Esports Nepal",
  footerBottomSecondary: "Supabase-powered public hub for events, teams, players, rankings, media, sponsors, and community coverage.",
};

function cleanString(value?: string | null) {
  const normalizedValue = value?.trim();
  return normalizedValue ? normalizedValue : undefined;
}

function cleanStringArray(values?: string[] | string | null) {
  const normalizedValues = Array.isArray(values)
    ? values
    : typeof values === "string"
      ? values.split(/[\n,]+/g)
      : [];

  return Array.from(new Set(normalizedValues.map((value) => value.trim()).filter(Boolean)));
}

function normalizeBody(body: string[] | string | null | undefined) {
  const paragraphs = Array.isArray(body) ? body : typeof body === "string" ? body.split(/\n{2,}/g) : [];
  return paragraphs.map((paragraph) => paragraph.trim()).filter(Boolean);
}

function normalizeHeroSlide(slide: Partial<HomepageHeroSlideRecord>, index: number): HomepageHeroSlideRecord {
  return {
    id: cleanString(slide.id) ?? `hero-slide-${index + 1}`,
    badge: cleanString(slide.badge) ?? "Bravo Gaming Esports",
    title: cleanString(slide.title) ?? "Nepal's premier esports platform",
    description:
      cleanString(slide.description) ??
      "Publish hero slides from admin to spotlight live events, flagship coverage, sponsors, or key campaigns.",
    primaryLabel: cleanString(slide.primaryLabel) ?? "Explore",
    primaryHref: cleanString(slide.primaryHref) ?? "/",
    secondaryLabel: cleanString(slide.secondaryLabel),
    secondaryHref: cleanString(slide.secondaryHref),
    tertiaryLabel: cleanString(slide.tertiaryLabel),
    tertiaryHref: cleanString(slide.tertiaryHref),
  };
}

function normalizeFooterLink(link: Partial<FooterLinkRecord>): FooterLinkRecord | null {
  const label = cleanString(link.label);
  const href = cleanString(link.href);

  if (!label || !href) {
    return null;
  }

  return { label, href };
}

function normalizeFooterColumn(column: Partial<FooterColumnRecord>, index: number): FooterColumnRecord {
  const fallbackColumn = DEFAULT_HOMEPAGE_CONTENT.footerColumns[index] ?? DEFAULT_HOMEPAGE_CONTENT.footerColumns[0];
  const links = Array.isArray(column.links)
    ? column.links
        .map((link) => normalizeFooterLink(link))
        .filter((link): link is FooterLinkRecord => Boolean(link))
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
  const heroSlidesInput = Array.isArray(data?.heroSlides) && data.heroSlides.length > 0 ? data.heroSlides : DEFAULT_HOMEPAGE_CONTENT.heroSlides;
  const footerColumnsInput =
    Array.isArray(data?.footerColumns) && data.footerColumns.length > 0 ? data.footerColumns : DEFAULT_HOMEPAGE_CONTENT.footerColumns;
  const footerHighlightsInput =
    Array.isArray(data?.footerHighlights) && data.footerHighlights.length > 0
      ? data.footerHighlights
      : DEFAULT_HOMEPAGE_CONTENT.footerHighlights;

  return {
    id: "main",
    heroSlides: heroSlidesInput.slice(0, 3).map((slide, index) => normalizeHeroSlide(slide, index)),
    breakingNewsSlug: cleanString(data?.breakingNewsSlug),
    featuredNewsSlugs: cleanStringArray(data?.featuredNewsSlugs),
    featuredEventSlugs: cleanStringArray(data?.featuredEventSlugs),
    featuredSponsorSlugs: cleanStringArray(data?.featuredSponsorSlugs),
    featuredMediaIds: cleanStringArray(data?.featuredMediaIds),
    featuredTeamIds: cleanStringArray(data?.featuredTeamIds),
    featuredPlayerIds: cleanStringArray(data?.featuredPlayerIds),
    liveTitle: cleanString(data?.liveTitle),
    liveSubtitle: cleanString(data?.liveSubtitle),
    liveViewers: cleanString(data?.liveViewers),
    liveHref: cleanString(data?.liveHref),
    footerTitle: cleanString(data?.footerTitle) ?? DEFAULT_HOMEPAGE_CONTENT.footerTitle,
    footerTagline: cleanString(data?.footerTagline) ?? DEFAULT_HOMEPAGE_CONTENT.footerTagline,
    footerDescription: cleanString(data?.footerDescription) ?? DEFAULT_HOMEPAGE_CONTENT.footerDescription,
    footerPrimaryLabel: cleanString(data?.footerPrimaryLabel) ?? DEFAULT_HOMEPAGE_CONTENT.footerPrimaryLabel,
    footerPrimaryHref: cleanString(data?.footerPrimaryHref) ?? DEFAULT_HOMEPAGE_CONTENT.footerPrimaryHref,
    footerSecondaryLabel: cleanString(data?.footerSecondaryLabel) ?? DEFAULT_HOMEPAGE_CONTENT.footerSecondaryLabel,
    footerSecondaryHref: cleanString(data?.footerSecondaryHref) ?? DEFAULT_HOMEPAGE_CONTENT.footerSecondaryHref,
    footerColumns: footerColumnsInput.slice(0, 4).map((column, index) => normalizeFooterColumn(column, index)),
    footerHighlights: footerHighlightsInput.slice(0, 3).map((highlight, index) => normalizeFooterHighlight(highlight, index)),
    footerBottomPrimary: cleanString(data?.footerBottomPrimary) ?? DEFAULT_HOMEPAGE_CONTENT.footerBottomPrimary,
    footerBottomSecondary: cleanString(data?.footerBottomSecondary) ?? DEFAULT_HOMEPAGE_CONTENT.footerBottomSecondary,
    updatedAt: cleanString(data?.updatedAt) ?? new Date().toISOString(),
  };
}

function normalizeManagedNewsArticle(
  data: Omit<Partial<ManagedNewsArticleRecord>, "body"> & { title: string; summary: string; body?: string[] | string }
): ManagedNewsArticleRecord {
  const now = new Date().toISOString();
  const title = data.title.trim();

  return {
    id: cleanString(data.id) ?? randomUUID(),
    slug: cleanString(data.slug) ?? slugify(title),
    title,
    summary: data.summary.trim(),
    body: normalizeBody(data.body),
    date: cleanString(data.date) ?? now.slice(0, 10),
    category: cleanString(data.category) ?? "Bravo Gaming",
    tags: cleanStringArray(data.tags),
    authorName: cleanString(data.authorName) ?? "Bravo Editorial Desk",
    gameSlug: cleanString(data.gameSlug),
    featured: Boolean(data.featured),
    breaking: Boolean(data.breaking),
    state: data.state === "draft" ? "draft" : "published",
    imageUrl: cleanString(data.imageUrl),
    seoTitle: cleanString(data.seoTitle),
    seoDescription: cleanString(data.seoDescription),
    deletedAt: cleanString(data.deletedAt),
    createdAt: cleanString(data.createdAt) ?? now,
    updatedAt: now,
  };
}

function compareDateDesc(firstValue: { date?: string; updatedAt?: string }, secondValue: { date?: string; updatedAt?: string }) {
  const firstTimestamp = Date.parse(firstValue.date ?? firstValue.updatedAt ?? "");
  const secondTimestamp = Date.parse(secondValue.date ?? secondValue.updatedAt ?? "");

  if (Number.isFinite(firstTimestamp) && Number.isFinite(secondTimestamp) && firstTimestamp !== secondTimestamp) {
    return secondTimestamp - firstTimestamp;
  }

  return (secondValue.date ?? secondValue.updatedAt ?? "").localeCompare(firstValue.date ?? firstValue.updatedAt ?? "");
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
    const normalizedArticles = filterSoftDeleted(articles.map((article) =>
      normalizeManagedNewsArticle({
        ...article,
        title: article.title,
        summary: article.summary,
      })
    ));

    return normalizedArticles
      .filter((article) => options.includeDrafts || article.state === "published")
      .sort(compareDateDesc);
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
  data: Omit<Partial<ManagedNewsArticleRecord>, "body"> & { title: string; summary: string; body?: string[] | string },
  id?: string
) {
  const payload = normalizeManagedNewsArticle({
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
    createdAt: payload.createdAt ?? now,
    updatedAt: now,
  };

  await saveDocument(COLLECTIONS.newsArticles, docId, nextPayload as unknown as Record<string, unknown>);
  return { ...nextPayload, id: docId };
}

export async function deleteManagedNewsArticle(id: string) {
  await softDeleteDocumentEntity(COLLECTIONS.newsArticles, id);
  return { id, deleted: true };
}
