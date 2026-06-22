import type { Metadata } from "next";
import { PlatformPlayerDashboardPage } from "@/components/platform/PlatformPages";
import { getPubgHubDataset } from "@/lib/pubg-hub";

export const metadata: Metadata = {
  title: "Player Dashboard",
  description: "Bravo Gaming Esports player dashboard for approved player profile access, stats, and match history.",
};

export const revalidate = 300;

export default async function PlayerDashboardPage() {
  const pubg = await getPubgHubDataset();
  return <PlatformPlayerDashboardPage pubg={pubg} />;
}
