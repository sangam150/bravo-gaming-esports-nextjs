import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { serializeJsonLd } from "../components/JsonLd";
import { buildContentMetadata } from "../lib/metadata";
import { buildArticleStructuredData, buildBreadcrumbStructuredData, buildPublicEventStructuredData } from "../lib/structured-data";

const workspaceRoot = process.cwd();
process.env.NEXT_PUBLIC_SITE_URL = "https://bravogamingesports.com";

function read(relativePath: string) {
  return readFileSync(path.join(workspaceRoot, relativePath), "utf8");
}

function listPageFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) return listPageFiles(absolutePath);
    return entry.isFile() && entry.name === "page.tsx" ? [absolutePath] : [];
  });
}

const unsafeJson = serializeJsonLd({
  value: "</script><script>alert('unsafe')</script>\u2028\u2029",
});
assert.doesNotMatch(unsafeJson, /</, "JSON-LD must escape HTML opening delimiters");
assert.doesNotMatch(unsafeJson, /\u2028|\u2029/u, "JSON-LD must escape Unicode line separators");
assert.match(unsafeJson, /\\u003c\/script>/, "JSON-LD must preserve escaped closing-script text as data");

const websiteMetadata = buildContentMetadata({
  title: "Events",
  description: "Published event details.",
  path: "/events",
});
const websiteMetadataJson = JSON.stringify(websiteMetadata);
assert.match(
  websiteMetadataJson,
  /"canonical":"https:\/\/bravogamingesports\.com\/events"/,
  "content metadata must include an absolute canonical route",
);
assert.match(websiteMetadataJson, /"type":"website"/, "ordinary pages must default to Open Graph website");
assert.match(websiteMetadataJson, /"twitter":/, "content metadata must include Twitter card fields");
assert.match(websiteMetadataJson, /Events \| Bravo Gaming Esports/, "page titles must include the site name once");

const unsafeCanonicalMetadata = JSON.stringify(
  buildContentMetadata({
    title: "Unsafe canonical test",
    description: "Protocol validation.",
    path: "/safe-path",
    canonicalUrl: "javascript:alert('unsafe')",
  }),
);
assert.doesNotMatch(unsafeCanonicalMetadata, /javascript:/, "metadata URLs must reject unsupported protocols");
assert.match(unsafeCanonicalMetadata, /bravogamingesports\.com\/safe-path/, "invalid canonicals must fall back to the route path");

const articleMetadataJson = JSON.stringify(
  buildContentMetadata({
    title: "Published article",
    description: "Published article details.",
    path: "/news/published-article",
    type: "article",
    publishedTime: "2026-01-02T03:04:05.000Z",
  }),
);
assert.match(articleMetadataJson, /"type":"article"/, "articles must retain Open Graph article metadata");
assert.match(articleMetadataJson, /"publishedTime":/, "article metadata must retain its publication date");

const breadcrumbs = buildBreadcrumbStructuredData([
  { name: "Home", path: "/" },
  { name: "Events", path: "/events" },
]);
assert.equal(breadcrumbs["@type"], "BreadcrumbList");
assert.deepEqual(
  breadcrumbs.itemListElement.map((item) => item.position),
  [1, 2],
  "breadcrumb positions must be ordered",
);
assert.equal(breadcrumbs.itemListElement[1]?.item, "https://bravogamingesports.com/events");

const eventStructuredData = buildPublicEventStructuredData({
  lifecycle: "cancelled",
  name: "Verified Event",
  path: "/pubg/events/verified-event",
  region: "Nepal",
  slug: "verified-event",
  startDate: "2026-08-01",
  summary: "Published event information.",
});
assert.equal(eventStructuredData["@type"], "SportsEvent");
assert.equal(eventStructuredData.eventStatus, "https://schema.org/EventCancelled");
assert.equal(eventStructuredData.url, "https://bravogamingesports.com/pubg/events/verified-event");

const articleStructuredData = buildArticleStructuredData({
  authorName: "Bravo Editorial Desk",
  category: "Tournament",
  description: "Published tournament update.",
  path: "/news/tournament-update",
  publishedAt: "2026-07-01",
  tags: ["PUBG PC", "Tournament"],
  title: "Tournament update",
});
assert.equal(articleStructuredData["@type"], "Article");
assert.match(JSON.stringify(articleStructuredData), /"datePublished":/);
assert.equal(articleStructuredData.mainEntityOfPage, "https://bravogamingesports.com/news/tournament-update");

const privatePagePrefixes = ["app/admin/", "app/dashboard/", "app/login/", "app/player/login/", "app/reset-password/", "app/team/"];
const publicPagesWithoutMetadata = listPageFiles(path.join(workspaceRoot, "app"))
  .map((absolutePath) => path.relative(workspaceRoot, absolutePath).replaceAll("\\", "/"))
  .filter((relativePath) => !privatePagePrefixes.some((prefix) => relativePath.startsWith(prefix)))
  .filter((relativePath) => {
    const source = read(relativePath);
    const redirects = /\b(?:permanentRedirect|redirect)\(/.test(source);
    const rendersPage = /return\s*(?:\(|<)/.test(source);
    return !(redirects && !rendersPage);
  })
  .filter((relativePath) => {
    const source = read(relativePath);
    return !/buildContentMetadata|export const metadata|generateMetadata/.test(source);
  });
assert.deepEqual(publicPagesWithoutMetadata, [], "every rendered public page must define route-specific metadata");

const rootLayoutSource = read("app/layout.tsx");
assert.match(rootLayoutSource, /<JsonLd data=\{structuredData\}/, "root Organization and WebSite data must use the safe JSON-LD component");
assert.doesNotMatch(rootLayoutSource, /JSON\.stringify\(structuredData\)/, "root layout must not inject raw JSON-LD");
assert.doesNotMatch(rootLayoutSource, /Premier|Valorant Nepal|CS2 Nepal/, "root metadata must not make unsupported coverage claims");

const eventPageSource = read("app/events/[slug]/page.tsx");
assert.match(eventPageSource, /buildPublicEventStructuredData/, "event details must publish SportsEvent structured data");
assert.match(eventPageSource, /buildBreadcrumbStructuredData/, "event details must publish breadcrumb structured data");

const tournamentPageSource = read("app/tournaments/[tournamentId]/page.tsx");
assert.match(tournamentPageSource, /buildPublicEventStructuredData/, "tournament details must publish SportsEvent structured data");
assert.match(tournamentPageSource, /buildBreadcrumbStructuredData/, "tournament details must publish breadcrumb structured data");

const newsPageSource = read("app/news/[slug]/page.tsx");
assert.match(newsPageSource, /buildArticleStructuredData/, "news details must publish Article structured data");
assert.match(newsPageSource, /buildBreadcrumbStructuredData/, "news details must publish breadcrumb structured data");
assert.doesNotMatch(newsPageSource, /dangerouslySetInnerHTML/, "news details must not inject raw JSON-LD");

const publicHeroSource = read("components/public/PublicDesignSystem.tsx");
assert.match(
  publicHeroSource,
  /<PublicBreadcrumbs current=\{breadcrumbCurrent\}/,
  "public list-page heroes must render semantic breadcrumbs",
);
for (const [relativePath, label] of [
  ["components/public/content/EventsReferencePage.tsx", "Events"],
  ["components/public/content/MediaReferencePage.tsx", "Media"],
  ["components/public/content/NewsReferencePage.tsx", "News"],
  ["components/public/content/SponsorsReferencePage.tsx", "Sponsors"],
] as const) {
  assert.match(read(relativePath), new RegExp(`breadcrumbCurrent="${label}"`), `${label} must expose a working breadcrumb`);
}

const publicLinksSource = read("lib/public-links.ts");
assert.match(
  publicLinksSource,
  /gameSlug\?\.trim\(\)\.toLowerCase\(\) === "pubg-pc"/,
  "event links must resolve the canonical PUBG detail route",
);
for (const relativePath of [
  "components/home/ReferenceHomePage.tsx",
  "components/public/content/EventsReferencePage.tsx",
  "components/platform/PlatformPages.tsx",
  "components/public/PubgLaunchPages.tsx",
] as const) {
  assert.match(read(relativePath), /getCanonicalPublicEventHref/, `${relativePath} must use canonical event detail links`);
}

const sitemapSource = read("app/sitemap.ts");
assert.match(sitemapSource, /event\.lifecycle !== "cancelled"/, "cancelled events must be excluded from the sitemap");
assert.match(sitemapSource, /event\.lifecycle !== "archived"/, "archived events must be excluded from the sitemap");
assert.match(sitemapSource, /team\.active/, "inactive teams must be excluded from the sitemap");
assert.match(sitemapSource, /season\.status === "active" \|\| season\.status === "completed"/, "non-public season states must be excluded");
assert.doesNotMatch(sitemapSource, /lastModified:\s*now/, "the sitemap must not invent modification dates");
assert.doesNotMatch(sitemapSource, /event\.updatedAt \?\? event\.startDate/, "event dates must not masquerade as modification dates");

const robotsSource = read("app/robots.ts");
assert.match(robotsSource, /"\/api\/"/, "API routes must be excluded from crawling");
assert.match(robotsSource, /"\/team\$"/, "the protected team root must be excluded exactly");
assert.doesNotMatch(robotsSource, /"\/team",/, "robots rules must not accidentally block the public /teams route");

console.log("SEO checks passed.");
