import type { MetadataRoute } from "next";
import { getPlayers, getTeams, getTournaments } from "@/lib/data";
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
  "/tournaments",
  "/videos",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();
  const [teams, players, tournaments] = await Promise.all([getTeams(), getPlayers(), getTournaments()]);

  const now = new Date();
  const staticEntries = staticRoutes.map((route) => ({
    url: `${siteUrl}${route}`,
    lastModified: now,
    changeFrequency: route === "" ? "daily" : "weekly",
    priority: route === "" ? 1 : 0.7,
  })) satisfies MetadataRoute.Sitemap;

  const dynamicEntries = [
    ...teams.map((team) => ({
      url: `${siteUrl}/teams/${team.id}`,
      lastModified: new Date(team.updatedAt ?? team.createdAt ?? now),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...players.map((player) => ({
      url: `${siteUrl}/players/${player.id}`,
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
  ];

  return [...staticEntries, ...dynamicEntries];
}
