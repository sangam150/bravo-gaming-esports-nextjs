import type { Metadata } from "next";
import MvpRankingPageClient from "@/components/mvp/MvpRankingPageClient";
import { getCurrentSeasonOverview, getPlayers } from "@/lib/data";

export const metadata: Metadata = {
  title: "MVP Rankings",
  description: "See Bravo Gaming Esports MVP rankings sorted by awards, kills, damage, assists, and matches played.",
};

export const revalidate = 300;

export default async function MvpRankingPage() {
  const [overview, players] = await Promise.all([getCurrentSeasonOverview(), getPlayers()]);
  return <MvpRankingPageClient initialOverview={overview} initialPlayers={players} />;
}
