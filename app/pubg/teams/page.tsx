import { CompetitionTeamsPage } from "@/components/public/competition/CompetitionTeamsPage";
import { buildContentMetadata } from "@/lib/metadata";
import { getPubgHubDataset } from "@/lib/pubg-hub";
import type { Metadata } from "next";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const metadata: Metadata = buildContentMetadata({
  title: "PUBG Teams | Bravo Gaming Esports",
  description: "Browse published Bravo PUBG team profiles, active rosters, event statistics, match history, and map performance.",
  path: "/pubg/teams",
  canonicalUrl: "/teams",
  type: "website",
});

export const revalidate = 300;

export default async function PubgTeamsIndexPage({ searchParams }: PageProps) {
  const [dataset, resolvedSearchParams] = await Promise.all([getPubgHubDataset(), searchParams]);
  return <CompetitionTeamsPage dataset={dataset} searchParams={resolvedSearchParams} basePath="/pubg/teams" />;
}
