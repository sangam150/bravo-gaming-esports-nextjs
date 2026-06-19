import type { MetadataRoute } from "next";
import { getSeasons } from "@/lib/data";
import { getPlatformHubData } from "@/lib/platform-hub";
import { getPubgHubDataset } from "@/lib/pubg-hub";
import { getSiteUrl } from "@/lib/site";

const staticRoutes = [
  "",
  "/about",
  "/contact",
  "/events",
  "/media",
  "/privacy",
  "/pubg",
  "/pubg/hall-of-fame",
  "/pubg/leaderboards",
  "/pubg/results",
  "/sponsors",
  "/terms",
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
    ...pubg.matches.map((match) => ({
      url: `${siteUrl}/pubg/matches/${match.id}`,
      lastModified: new Date(match.startTime ?? now),
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
    ...hub.events.map((event) => ({
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
  ];

  return [...staticEntries, ...dynamicEntries];
}
