import type { Metadata } from "next";
import TeamRegistrationPageClient from "@/components/team/TeamRegistrationPageClient";
import { buildContentMetadata } from "@/lib/metadata";
import { getRegistrationTargetSummary, listRegistrationTargets } from "@/lib/team-registration";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const metadata: Metadata = buildContentMetadata({
  title: "Register Team | Bravo Gaming Esports",
  description: "Register your PUBG PC team for Bravo Gaming Esports scrims and tournaments in Nepal.",
  path: "/teams/register",
  type: "website",
});

export default async function TeamRegisterPage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;
  const requestedTournamentId =
    typeof resolvedSearchParams.tournament === "string" ? resolvedSearchParams.tournament.trim() : "";
  const [selectedTournament, availableTournaments] = await Promise.all([
    requestedTournamentId ? getRegistrationTargetSummary(requestedTournamentId).catch(() => null) : Promise.resolve(null),
    listRegistrationTargets().catch(() => []),
  ]);

  const visibleTournaments =
    selectedTournament && !availableTournaments.some((tournament) => tournament.id === selectedTournament.id)
      ? [selectedTournament, ...availableTournaments]
      : availableTournaments;

  return (
    <TeamRegistrationPageClient
      availableTournaments={visibleTournaments}
      hasEventQuery={Boolean(requestedTournamentId)}
      selectedTournament={selectedTournament}
    />
  );
}
