import JsonLd from "@/components/JsonLd";
import TournamentDetailClient from "@/components/tournaments/TournamentDetailClient";
import {
  getPlayers,
  getTeams,
  getTournament,
  getTournamentMatches,
  getTournamentPlayers,
  getTournamentStandings,
  getTournamentTeams,
} from "@/lib/data";
import { buildContentMetadata } from "@/lib/metadata";
import { buildBreadcrumbStructuredData, buildPublicEventStructuredData } from "@/lib/structured-data";
import { buildTournamentStandings } from "@/lib/tournament-standings";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

type PageProps = { params: Promise<{ tournamentId: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { tournamentId } = await params;
  const tournament = await getTournament(tournamentId);

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
  const [tournament, matches, tournamentTeams, tournamentPlayers, storedStandings, allTeams, allPlayers] = await Promise.all([
    getTournament(tournamentId),
    getTournamentMatches(tournamentId),
    getTournamentTeams(tournamentId),
    getTournamentPlayers(tournamentId),
    getTournamentStandings(tournamentId),
    getTeams(),
    getPlayers(),
  ]);

  if (!tournament) notFound();

  const teams =
    tournamentTeams.length > 0 ? tournamentTeams : allTeams.filter((team) => (tournament.registeredTeamIds ?? []).includes(team.id));

  const players =
    tournamentPlayers.length > 0
      ? tournamentPlayers
      : allPlayers.filter((player) => player.teamId && teams.some((team) => team.id === player.teamId));

  const standings = storedStandings.length > 0 ? storedStandings : buildTournamentStandings(tournamentId, tournament.title, matches);

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
          organizerName: "Bravo Gaming Esports",
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
      <TournamentDetailClient tournament={tournament} matches={matches} teams={teams} players={players} standings={standings} />
    </>
  );
}
