import type { Metadata } from "next";
import TeamRegistrationPageClient from "@/components/team/TeamRegistrationPageClient";
import { buildContentMetadata } from "@/lib/metadata";
import { getRegistrationTargetSummary } from "@/lib/team-registration";

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
  const selectedTournament = requestedTournamentId
    ? await getRegistrationTargetSummary(requestedTournamentId).catch(() => null)
    : null;

  return (
    <TeamRegistrationPageClient
      hasEventQuery={Boolean(requestedTournamentId)}
      selectedTournament={selectedTournament}
    />
  );
}
