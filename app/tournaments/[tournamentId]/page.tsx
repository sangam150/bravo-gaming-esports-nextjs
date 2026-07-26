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

  return {
    title: `${tournament.title} Tournament`,
    description: `Follow ${tournament.title} standings, teams, and match results on Bravo Gaming Esports.`,
  };
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

  return <TournamentDetailClient tournament={tournament} matches={matches} teams={teams} players={players} standings={standings} />;
}
