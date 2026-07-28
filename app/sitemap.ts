import { getSeasons, getTournaments } from "@/lib/data";
import { getPlatformHubData } from "@/lib/platform-hub";
import { getPubgHubDataset } from "@/lib/pubg-hub";
import { getCanonicalPublicEventHref } from "@/lib/public-links";
import { getSiteUrl } from "@/lib/site";
import type { MetadataRoute } from "next";

const staticRoutes = [
  "",
  "/about",
  "/anti-cheat",
  "/calendar",
  "/community/announcements",
  "/compare",
  "/contact",
  "/events",
  "/games",
  "/live-stream",
  "/media",
  "/mvp-ranking",
  "/news",
  "/organizations",
  "/players",
  "/privacy",
  "/pubg",
  "/pubg/community",
  "/pubg/events",
  "/pubg/hall-of-fame",
  "/pubg/leaderboards",
  "/pubg/results",
  "/pubg-scrims",
  "/rankings",
  "/rules",
  "/sponsor-kit",
  "/sponsors",
  "/statistics",
  "/stream-schedule",
  "/teams",
  "/teams/register",
  "/terms",
  "/tournament-partners",
  "/tournaments",
];

function withLastModified(value: string | Date | null | undefined) {
  if (!value) return {};
  const parsedValue = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsedValue.getTime()) ? {} : { lastModified: parsedValue };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();
  const [seasons, tournaments, hub, pubg] = await Promise.all([getSeasons(), getTournaments(), getPlatformHubData(), getPubgHubDataset()]);

  const staticEntries = staticRoutes.map((route) => ({
    url: `${siteUrl}${route}`,
    changeFrequency: route === "" ? "daily" : "weekly",
    priority: route === "" ? 1 : 0.7,
  })) satisfies MetadataRoute.Sitemap;

  const dynamicEntries = [
    ...seasons
      .filter((season) => season.status === "active" || season.status === "completed")
      .map((season) => ({
        url: `${siteUrl}/pubg/seasons/${season.slug}`,
        ...withLastModified(season.updatedAt ?? season.createdAt),
        changeFrequency: "weekly" as const,
        priority: season.status === "active" ? 0.9 : 0.7,
      })),
    ...tournaments.map((tournament) => ({
      url: `${siteUrl}/tournaments/${tournament.id}`,
      ...withLastModified(tournament.updatedAt ?? tournament.createdAt),
      changeFrequency: tournament.status === "LIVE" ? ("daily" as const) : ("weekly" as const),
      priority: tournament.status === "LIVE" ? 0.9 : 0.7,
    })),
    ...pubg.teams
      .filter((team) => team.active)
      .map((team) => ({
        url: `${siteUrl}/pubg/teams/${team.slug}`,
        changeFrequency: "weekly" as const,
        priority: 0.8,
      })),
    ...pubg.players.map((player) => ({
      url: `${siteUrl}/pubg/players/${player.slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...pubg.matches
      .filter((match) => match.status === "published")
      .map((match) => ({
        url: `${siteUrl}/pubg/matches/${match.id}`,
        ...withLastModified(match.startTime),
        changeFrequency: "daily" as const,
        priority: 0.8,
      })),
    ...hub.events
      .filter(
        (event) =>
          event.state === "published" && event.lifecycle !== "draft" && event.lifecycle !== "cancelled" && event.lifecycle !== "archived",
      )
      .map((event) => ({
        url: `${siteUrl}${getCanonicalPublicEventHref(event)}`,
        ...withLastModified(event.updatedAt),
        changeFrequency: "daily" as const,
        priority: event.status === "live" ? 0.9 : event.featured ? 0.8 : 0.7,
      })),
    ...hub.sponsors
      .filter((sponsor) => sponsor.visible && sponsor.slug)
      .map((sponsor) => ({
        url: `${siteUrl}/sponsors/${sponsor.slug}`,
        ...withLastModified(sponsor.updatedAt),
        changeFrequency: "monthly" as const,
        priority: 0.6,
      })),
    ...hub.media
      .filter((item) => item.slug)
      .map((item) => ({
        url: `${siteUrl}/media/${item.slug}`,
        ...withLastModified(item.updatedAt ?? item.publishedAt),
        changeFrequency: "weekly" as const,
        priority: item.featured ? 0.8 : 0.6,
      })),
    ...hub.news
      .filter((article) => article.slug)
      .map((article) => ({
        url: `${siteUrl}/news/${article.slug}`,
        ...withLastModified(article.updatedAt ?? article.publishedAt ?? article.date),
        changeFrequency: "weekly" as const,
        priority: article.featured || article.breaking ? 0.8 : 0.7,
      })),
    ...hub.games
      .filter((game) => game.status === "flagship" || game.status === "active")
      .map((game) => ({
        url: `${siteUrl}/games/${game.slug}`,
        changeFrequency: "monthly" as const,
        priority: game.flagship ? 0.8 : 0.6,
      })),
  ];

  return Array.from(new Map([...staticEntries, ...dynamicEntries].map((entry) => [entry.url, entry])).values());
}
