import type { Metadata } from "next";
import TournamentsPageClient from "@/components/tournaments/TournamentsPage";
import { getTournaments } from "@/lib/data";

export const metadata: Metadata = {
  title: "Tournaments",
  description: "Track upcoming, live, and completed Bravo Gaming Esports tournaments with verified PUBG results.",
};

export const revalidate = 300;

export default async function Page() {
  const tournaments = await getTournaments();
  return <TournamentsPageClient initialTournaments={tournaments} />;
}
