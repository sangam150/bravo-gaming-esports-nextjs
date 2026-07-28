import { CompetitionPlayersPage } from "@/components/public/competition/CompetitionPlayersPage";
import { buildContentMetadata } from "@/lib/metadata";
import { getPubgHubDataset } from "@/lib/pubg-hub";
import type { Metadata } from "next";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const metadata: Metadata = buildContentMetadata({
  title: "PUBG Players | Bravo Gaming Esports",
  description: "Browse published Bravo PUBG player profiles, event statistics, match history, and recent form.",
  path: "/pubg/players",
  canonicalUrl: "/players",
  type: "website",
});

export const revalidate = 300;

export default async function PubgPlayersIndexPage({ searchParams }: PageProps) {
  const [dataset, resolvedSearchParams] = await Promise.all([getPubgHubDataset(), searchParams]);
  return <CompetitionPlayersPage dataset={dataset} searchParams={resolvedSearchParams} basePath="/pubg/players" />;
}
