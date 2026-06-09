import type { Metadata } from "next";
import TeamsPageClient from "@/components/teams/TeamsPageClient";
import { getTeams } from "@/lib/data";

export const metadata: Metadata = {
  title: "Teams",
  description: "Browse every registered Bravo Gaming Esports team, roster slot, and current standings.",
};

export const revalidate = 300;

export default async function Page() {
  const teams = await getTeams();
  return <TeamsPageClient initialTeams={teams} />;
}
