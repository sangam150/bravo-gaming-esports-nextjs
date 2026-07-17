import type { Metadata } from "next";
import { PubgTeamsLaunchPage } from "@/components/public/PublicLandingPages";
import { PubgTeamsPage } from "@/components/pubg/PubgPublicPages";
import { getPlatformHubData } from "@/lib/platform-hub";
import { getPubgHubDataset, getPublicPubgTeams } from "@/lib/pubg-hub";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const metadata: Metadata = {
  title: "PUBG Teams",
  description: "Explore Bravo PUBG teams with current rosters, event stats, form, match history, and map performance.",
};

export const revalidate = 300;

export default async function PubgTeamsIndexPage({ searchParams }: PageProps) {
  const [dataset, hub, resolvedSearchParams] = await Promise.all([getPubgHubDataset(), getPlatformHubData(), searchParams]);

  if (getPublicPubgTeams(dataset).length === 0) {
    return <PubgTeamsLaunchPage hub={hub} />;
  }

  return <PubgTeamsPage dataset={dataset} searchParams={resolvedSearchParams} />;
}
