import type { Metadata } from "next";
import { PubgDashboardPage } from "@/components/pubg/PubgPublicPages";
import { getPubgDashboardData } from "@/lib/pubg-hub";

export const metadata: Metadata = {
  title: "PUBG Dashboard",
  description: "Stats-first Bravo PUBG dashboard with event context, team form, player form, match activity, fantasy preview, and access routes.",
};

export const revalidate = 300;

export default async function PubgPage() {
  const dashboard = await getPubgDashboardData();

  return (
    <PubgDashboardPage
      dataset={dashboard}
      recentMatches={dashboard.recentMatches}
      recentEvents={dashboard.recentEvents}
      topPlayers={dashboard.topPlayers}
      topTeams={dashboard.topTeams}
      activeEvents={dashboard.activeEvents}
      mapPulse={dashboard.mapPulse}
    />
  );
}
