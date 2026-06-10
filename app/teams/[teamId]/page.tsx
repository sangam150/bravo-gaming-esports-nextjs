import type { Metadata } from "next";
import { notFound } from "next/navigation";
import TeamProfileClient from "@/components/teams/TeamProfileClient";
import { getPlayers, getTeam, getTeamMatchPlayers } from "@/lib/data";

type PageProps = { params: Promise<{ teamId: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { teamId } = await params;
  const team = await getTeam(teamId);

  if (!team) {
    return {
      title: "Team Not Found",
    };
  }

  return {
    title: `${team.name} Team Profile`,
    description: `View ${team.name} roster details, team ranking, kills, and Bravo Gaming Esports match performance.`,
  };
}

export default async function TeamProfilePage({ params }: PageProps) {
  const { teamId } = await params;
  const team = await getTeam(teamId);
  if (!team) notFound();

  const [allPlayers, matchPlayers] = await Promise.all([getPlayers(), getTeamMatchPlayers(team.name)]);

  return <TeamProfileClient initialTeam={team} initialPlayers={allPlayers} initialMatchPlayers={matchPlayers} />;
}
