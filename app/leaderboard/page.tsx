import type { Metadata } from "next";
import LeaderboardPageClient from "@/components/leaderboard/LeaderboardPage";
import { getLeaderboard } from "@/lib/data";

export const metadata: Metadata = {
  title: "Leaderboard",
  description: "See the latest Bravo Gaming Esports leaderboard with live PUBG-driven standings and placements.",
};

export const revalidate = 300;

export default async function Page() {
  const rows = await getLeaderboard();
  return <LeaderboardPageClient initialRows={rows} />;
}
