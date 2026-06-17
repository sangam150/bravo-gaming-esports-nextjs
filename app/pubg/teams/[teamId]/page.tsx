import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PubgTeamDetailPage } from "@/components/pubg/PubgPublicPages";
import { getPubgHubDataset, getPubgTeamById } from "@/lib/pubg-hub";

type PageProps = {
  params: Promise<{ teamId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { teamId } = await params;
  const team = await getPubgTeamById(teamId);

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
  const [{ teamId }, resolvedSearchParams, dataset] = await Promise.all([params, searchParams, getPubgHubDataset()]);
  const team = dataset.teams.find((item) => item.id === teamId) ?? null;

  if (!team) {
    notFound();
  }

  return <PubgTeamDetailPage team={team} dataset={dataset} searchParams={resolvedSearchParams} />;
}
