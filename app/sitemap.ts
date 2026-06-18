import type { MetadataRoute } from "next";
import { getPlayers, getTeams, getTournaments } from "@/lib/data";
import { getPlatformHubData } from "@/lib/platform-hub";
import { getSiteUrl } from "@/lib/site";

const staticRoutes = [
  "",
  "/about",
  "/about/founder",
  "/about/media-kit",
  "/about/sponsor-us",
  "/championships",
  "/community",
  "/community/announcements",
  "/community/highlights",
  "/contact",
  "/current-season",
  "/feedback",
  "/giveaways",
  "/gta-rp",
  "/hall-of-fame",
  "/highlights",
  "/leaderboard",
  "/live-stream",
  "/mvp-ranking",
  "/news",
  "/partners",
  "/players",
  "/pubg-scrims",
  "/results",
  "/schedule",
  "/sponsors",
  "/statistics",
  "/stream-schedule",
  "/teams",
  "/teams/register",
  "/terms",
  "/tournaments",
  "/privacy",
  "/videos",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();
  const [teams, players, tournaments, hub] = await Promise.all([
    getTeams(),
    getPlayers(),
    getTournaments(),
    getPlatformHubData(),
  ]);

  const now = new Date();
  const staticEntries = staticRoutes.map((route) => ({
    url: `${siteUrl}${route}`,
    lastModified: now,
    changeFrequency: route === "" ? "daily" : "weekly",
    priority: route === "" ? 1 : 0.7,
  })) satisfies MetadataRoute.Sitemap;

  const dynamicEntries = [
    ...teams.map((team) => ({
      url: `${siteUrl}/teams/${team.slug ?? team.id}`,
      lastModified: new Date(team.updatedAt ?? team.createdAt ?? now),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...players.map((player) => ({
      url: `${siteUrl}/players/${player.slug ?? player.id}`,
      lastModified: new Date(player.updatedAt ?? player.createdAt ?? now),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...tournaments.map((tournament) => ({
      url: `${siteUrl}/tournaments/${tournament.id}`,
      lastModified: new Date(tournament.updatedAt ?? tournament.createdAt ?? now),
      changeFrequency: "daily" as const,
      priority: tournament.status === "LIVE" ? 0.9 : 0.8,
    })),
    ...hub.games.map((game) => ({
      url: `${siteUrl}/games/${game.slug}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: game.flagship ? 0.9 : 0.7,
    })),
    ...hub.news.map((article) => ({
      url: `${siteUrl}/news/${article.slug}`,
      lastModified: new Date(article.updatedAt ?? article.date ?? now),
      changeFrequency: "weekly" as const,
      priority: article.breaking ? 0.9 : article.featured ? 0.8 : 0.7,
    })),
    ...hub.events.map((event) => ({
      url: `${siteUrl}/events/${event.slug}`,
      lastModified: new Date(event.updatedAt ?? event.startDate ?? now),
      changeFrequency: "daily" as const,
      priority: event.status === "live" ? 0.9 : event.featured ? 0.8 : 0.7,
    })),
    ...hub.matches.map((match) => ({
      url: `${siteUrl}/matches/${match.id}`,
      lastModified: new Date(match.updatedAt ?? match.scheduledAt ?? now),
      changeFrequency: "daily" as const,
      priority: match.status === "live" ? 0.9 : 0.7,
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
