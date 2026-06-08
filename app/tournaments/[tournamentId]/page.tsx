import { notFound } from "next/navigation";
import TournamentDetailClient from "@/components/tournaments/TournamentDetailClient";
import { getLeaderboard, getPlayers, getTeams, getTournament, getTournamentMatches } from "@/lib/data";

type PageProps = { params: Promise<{ tournamentId: string }> };

export default async function TournamentDetailPage({ params }: PageProps) {
  const { tournamentId } = await params;
  const [tournament, matches, teams, players, leaderboard] = await Promise.all([
    getTournament(tournamentId),
    getTournamentMatches(tournamentId),
    getTeams(),
    getPlayers(),
    getLeaderboard(),
  ]);

  if (!tournament) notFound();

  const standings = leaderboard.slice(0, 5).map((r) => ({ team: r.team, points: r.points }));

  return (
    <TournamentDetailClient
      tournament={tournament}
      matches={matches}
      teams={teams}
      players={players}
      standings={standings}
    />
  );
}
