import type { Metadata } from "next";
import { PubgFantasyPage } from "@/components/pubg/PubgPublicPages";
import { getPubgHubDataset } from "@/lib/pubg-hub";

export const metadata: Metadata = {
  title: "PUBG Fantasy",
  description: "Bravo PUBG fantasy preview with event pools, five-player squad builder planning, and leaderboard context.",
};

export const revalidate = 300;

export default async function PubgFantasyIndexPage() {
  const dataset = await getPubgHubDataset();
  return <PubgFantasyPage dataset={dataset} />;
}
