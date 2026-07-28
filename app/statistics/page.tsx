import StatisticsPageClient from "@/components/statistics/StatisticsPageClient";
import { getCurrentSeasonOverview, getLeaderboard, getPlayers } from "@/lib/data";
import { buildContentMetadata } from "@/lib/metadata";
import type { Metadata } from "next";

export const metadata: Metadata = buildContentMetadata({
  title: "Competition Statistics | Bravo Gaming Esports",
  description: "View published Bravo Gaming Esports team standings, player standings, top fraggers, and MVP rankings.",
  path: "/statistics",
  type: "website",
});

export const revalidate = 300;

export default async function StatisticsPage() {
  const [overview, leaderboard, players] = await Promise.all([getCurrentSeasonOverview(), getLeaderboard(), getPlayers()]);

  return <StatisticsPageClient initialOverview={overview} initialLeaderboard={leaderboard} initialPlayers={players} />;
}
