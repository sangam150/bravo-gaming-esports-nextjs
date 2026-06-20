import type { Metadata } from "next";
import { PubgDashboardPage } from "@/components/pubg/PubgPublicPages";
import { getCurrentSeasonOverview } from "@/lib/data";
import { getPlatformHubData } from "@/lib/platform-hub";
import { getPubgDashboardData } from "@/lib/pubg-hub";

export const metadata: Metadata = {
  title: "Bravo Gaming PUBG PC",
  description: "Bravo Gaming's PUBG PC hub for seasons, tournaments, scrims, match results, leaderboards, teams, players, partners, and media.",
};

export const revalidate = 300;

export default async function PubgPage() {
  const [dashboard, hub, seasonOverview] = await Promise.all([
    getPubgDashboardData(),
    getPlatformHubData(),
    getCurrentSeasonOverview().catch(() => null),
  ]);
  const partners = hub.sponsors.filter((sponsor) => sponsor.showOnPubgPage);
  const latestMedia = hub.media.filter((item) => item.gameSlug === "pubg-pc").slice(0, 3);
  const activeSeason = seasonOverview
    ? {
        title: seasonOverview.season.seriesTitle || seasonOverview.season.title,
        slug: seasonOverview.season.slug || "current",
        currentDay: seasonOverview.season.currentDay,
        matchesPlayed: seasonOverview.matchesPlayed,
        teamsTracked: seasonOverview.teams.length,
        playersTracked: seasonOverview.players.length,
        currentTournamentTitle: seasonOverview.currentTournament?.title ?? null,
      }
    : null;

  return (
    <PubgDashboardPage
      dataset={dashboard}
      activeSeason={activeSeason}
      recentMatches={dashboard.recentMatches}
      recentEvents={dashboard.recentEvents}
      topPlayers={dashboard.topPlayers}
      topTeams={dashboard.topTeams}
      activeEvents={dashboard.activeEvents}
      mapPulse={dashboard.mapPulse}
      partners={partners}
      latestMedia={latestMedia}
    />
  );
}
