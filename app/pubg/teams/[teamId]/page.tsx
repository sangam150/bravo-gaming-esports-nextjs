import JsonLd from "@/components/JsonLd";
import { PubgTeamProfileShowcasePage } from "@/components/pubg/PubgShowcasePages";
import { buildContentMetadata } from "@/lib/metadata";
import { findPublicPubgTeam, getPubgHubDataset, getPubgTeamById } from "@/lib/pubg-hub";
import { buildBreadcrumbStructuredData } from "@/lib/structured-data";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

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
    const team = findPublicPubgTeam(dataset, teamId);
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

  return buildContentMetadata({
    title: `${team.name} Team Profile | Bravo Gaming Esports`,
    description: `Track ${team.name} on Bravo with roster context, event stats, match history, map splits, and form indicators.`,
    path: `/pubg/teams/${team.slug}`,
    imageUrl: team.logoUrl,
    type: "website",
  });
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

  return (
    <>
      <JsonLd
        data={buildBreadcrumbStructuredData([
          { name: "Home", path: "/" },
          { name: "PUBG", path: "/pubg" },
          { name: "Teams", path: "/pubg/teams" },
          { name: team.name, path: `/pubg/teams/${team.slug}` },
        ])}
      />
      <PubgTeamProfileShowcasePage team={team} dataset={dataset} searchParams={resolvedSearchParams} />
    </>
  );
}
