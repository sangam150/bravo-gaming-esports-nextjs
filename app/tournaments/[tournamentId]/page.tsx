import JsonLd from "@/components/JsonLd";
import TournamentDetailClient from "@/components/tournaments/TournamentDetailClient";
import { getPublicTournament } from "@/lib/data";
import { getPublicTournamentWorkspace } from "@/lib/tournament-workspace";
import { buildContentMetadata } from "@/lib/metadata";
import { buildBreadcrumbStructuredData, buildPublicEventStructuredData } from "@/lib/structured-data";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

type PageProps = { params: Promise<{ tournamentId: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { tournamentId } = await params;
  const tournament = await getPublicTournament(tournamentId);

  if (!tournament) {
    return {
      title: "Tournament Not Found",
    };
  }

  return buildContentMetadata({
    title: `${tournament.title} | Bravo Gaming Esports`,
    description: `Follow ${tournament.title} standings, teams, and match results on Bravo Gaming Esports.`,
    path: `/tournaments/${tournament.id}`,
    imageUrl: tournament.bannerUrl,
    type: "website",
  });
}

export default async function TournamentDetailPage({ params }: PageProps) {
  const { tournamentId } = await params;
  const workspace = await getPublicTournamentWorkspace(tournamentId);
  if (!workspace) notFound();
  const { matches, teams, players, standings, production, sponsors, announcements, serverTime, ...tournament } = workspace;

  const tournamentPath = `/tournaments/${tournament.id}`;
  const lifecycle = tournament.status === "LIVE" ? "ongoing" : tournament.status === "COMPLETED" ? "completed" : "upcoming";

  return (
    <>
      <JsonLd
        data={buildPublicEventStructuredData({
          bannerUrl: tournament.bannerUrl,
          endDate: tournament.endDate,
          lifecycle,
          name: tournament.title,
          organizerName: production?.organizerName || "Bravo Gaming Esports",
          path: tournamentPath,
          region: tournament.server,
          slug: tournament.id,
          startDate: tournament.startDate,
          summary: tournament.description,
        })}
      />
      <JsonLd
        data={buildBreadcrumbStructuredData([
          { name: "Home", path: "/" },
          { name: "Tournaments", path: "/tournaments" },
          { name: tournament.title, path: tournamentPath },
        ])}
      />
      <TournamentDetailClient key={tournament.id} tournament={tournament} matches={matches} teams={teams} players={players} standings={standings} production={production} sponsors={sponsors} announcements={announcements} serverTime={serverTime} />
    </>
  );
}
