import TournamentsPageClient from "@/components/tournaments/TournamentsPage";
import { getTournaments } from "@/lib/data";
import { buildContentMetadata } from "@/lib/metadata";
import type { Metadata } from "next";

export const metadata: Metadata = buildContentMetadata({
  title: "Tournaments | Bravo Gaming Esports",
  description: "Browse published Bravo Gaming Esports tournament schedules, registration details, standings, and results.",
  path: "/tournaments",
  type: "website",
});

export const revalidate = 300;

export default async function Page() {
  const tournaments = await getTournaments();
  return <TournamentsPageClient initialTournaments={tournaments} />;
}
