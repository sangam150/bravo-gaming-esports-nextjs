import type { MetadataRoute } from "next";
import { getSeasons } from "@/lib/data";
import { getPlatformHubData } from "@/lib/platform-hub";
import { getPubgHubDataset } from "@/lib/pubg-hub";
import { getSiteUrl } from "@/lib/site";

const staticRoutes = [
  "",
  "/stats",
  "/about",
  "/anti-cheat",
  "/contact",
  "/events",
  "/events/pubg-mahasangram-53821",
  "/live-stream",
  "/media",
  "/news",
  "/privacy",
  "/pubg",
  "/pubg/community",
  "/pubg/leaderboards",
  "/results",
  "/rules",
  "/sponsor-kit",
  "/sponsors",
  "/teams/register",
  "/terms",
  "/tournament-partners",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();
  const [seasons, hub, pubg] = await Promise.all([
    getSeasons(),
    getPlatformHubData(),
    getPubgHubDataset(),
  ]);

  const now = new Date();
  const staticEntries = staticRoutes.map((route) => ({
    url: `${siteUrl}${route}`,
    lastModified: now,
    changeFrequency: route === "" ? "daily" : "weekly",
    priority: route === "" ? 1 : 0.7,
  })) satisfies MetadataRoute.Sitemap;

  const dynamicEntries = [
    ...seasons.map((season) => ({
      url: `${siteUrl}/pubg/seasons/${season.slug}`,
      lastModified: new Date(season.updatedAt ?? season.createdAt ?? now),
      changeFrequency: "weekly" as const,
      priority: season.status === "active" ? 0.9 : 0.7,
    })),
    ...pubg.teams.map((team) => ({
      url: `${siteUrl}/pubg/teams/${team.slug}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...pubg.players.map((player) => ({
      url: `${siteUrl}/pubg/players/${player.slug}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...pubg.matches.filter((match) => match.status === "published").map((match) => ({
      url: `${siteUrl}/pubg/matches/${match.id}`,
      lastModified: new Date(match.startTime ?? now),
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
    ...hub.events.filter((event) => event.state === "published").map((event) => ({
      url: `${siteUrl}/events/${event.slug}`,
      lastModified: new Date(event.updatedAt ?? event.startDate ?? now),
      changeFrequency: "daily" as const,
      priority: event.status === "live" ? 0.9 : event.featured ? 0.8 : 0.7,
    })),
    ...hub.sponsors.map((sponsor) => ({
      url: `${siteUrl}/sponsors/${sponsor.slug}`,
      lastModified: new Date(sponsor.updatedAt ?? now),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    ...hub.media.map((item) => ({
      url: `${siteUrl}/media/${item.slug}`,
      lastModified: new Date(item.updatedAt ?? item.publishedAt ?? now),
      changeFrequency: "weekly" as const,
      priority: item.featured ? 0.8 : 0.6,
    })),
    ...hub.news.map((article) => ({
      url: `${siteUrl}/news/${article.slug}`,
      lastModified: new Date(article.updatedAt ?? article.publishedAt ?? article.date ?? now),
      changeFrequency: "weekly" as const,
      priority: article.featured || article.breaking ? 0.8 : 0.7,
    })),
  ];

  return [...staticEntries, ...dynamicEntries];
}
