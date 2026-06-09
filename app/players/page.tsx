import type { Metadata } from "next";
import PlayersPageClient from "@/components/players/PlayersPageClient";
import { getPlayers } from "@/lib/data";

export const metadata: Metadata = {
  title: "Players",
  description: "Explore Bravo Gaming Esports player profiles, form, kills, and season performance.",
};

export const revalidate = 300;

export default async function Page() {
  const players = await getPlayers();
  return <PlayersPageClient initialPlayers={players} />;
}
