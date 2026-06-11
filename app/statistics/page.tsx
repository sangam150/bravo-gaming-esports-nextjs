import type { Metadata } from "next";
import StatisticsPageClient from "@/components/statistics/StatisticsPageClient";
import { getCurrentSeasonOverview, getLeaderboard, getPlayers } from "@/lib/data";

export const metadata: Metadata = {
  title: "Statistics",
  description: "Track Bravo Gaming Esports team standings, player standings, top fraggers, and MVP rankings in real time.",
};

export const revalidate = 300;

export default async function StatisticsPage() {
  const [overview, leaderboard, players] = await Promise.all([
    getCurrentSeasonOverview(),
    getLeaderboard(),
    getPlayers(),
  ]);

  return (
    <StatisticsPageClient
      initialOverview={overview}
      initialLeaderboard={leaderboard}
      initialPlayers={players}
    />
  );
}
