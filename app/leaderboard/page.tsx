import type { Metadata } from "next";
import LeaderboardPageClient from "@/components/leaderboard/LeaderboardPage";
import { getCurrentSeasonOverview, getLeaderboard, getTournamentStandings, getTournaments } from "@/lib/data";
import { standingsToLeaderboardRows } from "@/lib/tournament-standings";

export const metadata: Metadata = {
  title: "Leaderboard",
  description: "See the latest Bravo Gaming Esports leaderboard with live PUBG-driven standings and placements.",
};

export const revalidate = 300;

export default async function Page() {
  const [rows, tournaments, currentSeasonOverview] = await Promise.all([
    getLeaderboard(),
    getTournaments(),
    getCurrentSeasonOverview(),
  ]);
  const leaderboardTournaments = (currentSeasonOverview?.tournaments ?? tournaments)
    .filter((tournament) => typeof (tournament.seasonDayNumber ?? tournament.dayNumber) === "number")
    .sort(
      (firstTournament, secondTournament) =>
        (firstTournament.seasonDayNumber ?? firstTournament.dayNumber ?? 99) -
        (secondTournament.seasonDayNumber ?? secondTournament.dayNumber ?? 99)
    );

  const tournamentLeaderboards = (
    await Promise.all(
      leaderboardTournaments.map(async (tournament) => ({
        id: tournament.id,
        title: `Day ${tournament.seasonDayNumber ?? tournament.dayNumber ?? "?"}`,
        subtitle: tournament.title,
        rows: standingsToLeaderboardRows(await getTournamentStandings(tournament.id)),
      }))
    )
  );

  return (
    <LeaderboardPageClient
      initialRows={currentSeasonOverview?.leaderboard ?? rows}
      overallLabel={currentSeasonOverview ? "Season Overall" : "Overall"}
      tournamentLeaderboards={tournamentLeaderboards}
    />
  );
}
