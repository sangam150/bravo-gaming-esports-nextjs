import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { PubgTeamDetailPage } from "@/components/pubg/PubgPublicPages";
import { getPubgHubDataset, getPubgTeamById } from "@/lib/pubg-hub";

type PageProps = {
  params: Promise<{ teamId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

async function resolveTeam(teamId: string) {
  try {
    return await getPubgTeamById(teamId);
  } catch {
    return null;
  }
}

async function resolveTeamDataset(teamId: string) {
  try {
    const dataset = await getPubgHubDataset();
    const normalizedTeamId = teamId.trim().toLowerCase();
    const team =
      dataset.teams.find((item) => item.id === teamId || item.slug.toLowerCase() === normalizedTeamId) ?? null;
    return { dataset, team };
  } catch {
    return { dataset: null, team: null };
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { teamId } = await params;
  const team = await resolveTeam(teamId);

  if (!team) {
    return { title: "PUBG Team Not Found" };
  }

  return {
    title: `${team.name} Team Profile`,
    description: `Track ${team.name} on Bravo with roster context, event stats, match history, map splits, and form indicators.`,
  };
}

export const revalidate = 300;

export default async function PubgTeamDetailRoute({ params, searchParams }: PageProps) {
  const [{ teamId }, resolvedSearchParams] = await Promise.all([params, searchParams]);
  const { dataset, team } = await resolveTeamDataset(teamId);

  if (!dataset || !team) {
    notFound();
  }

  if (teamId !== team.slug) {
    redirect(`/pubg/teams/${team.slug}`);
  }

  return <PubgTeamDetailPage team={team} dataset={dataset} searchParams={resolvedSearchParams} />;
}
