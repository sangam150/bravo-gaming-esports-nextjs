import MvpRankingPageClient from "@/components/mvp/MvpRankingPageClient";
import { getCurrentSeasonOverview, getPlayers } from "@/lib/data";
import { buildContentMetadata } from "@/lib/metadata";
import type { Metadata } from "next";

export const metadata: Metadata = buildContentMetadata({
  title: "MVP Rankings | Bravo Gaming Esports",
  description: "View published Bravo Gaming Esports player rankings using MVP awards, kills, damage, assists, and matches played.",
  path: "/mvp-ranking",
  type: "website",
});

export const revalidate = 300;

export default async function MvpRankingPage() {
  const [overview, players] = await Promise.all([getCurrentSeasonOverview(), getPlayers()]);
  return <MvpRankingPageClient initialOverview={overview} initialPlayers={players} />;
}
