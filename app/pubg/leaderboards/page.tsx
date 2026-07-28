import { CompetitionLeaderboardsPage } from "@/components/public/CompetitionReferencePages";
import { buildContentMetadata } from "@/lib/metadata";
import { getPubgHubDataset } from "@/lib/pubg-hub";
import type { Metadata } from "next";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const metadata: Metadata = buildContentMetadata({
  title: "PUBG Leaderboards | Bravo Gaming Esports",
  description: "Track Bravo PUBG team and player leaderboards built from published match results and standings.",
  path: "/pubg/leaderboards",
  type: "website",
});

export const revalidate = 300;

export default async function PubgLeaderboardsIndexPage({ searchParams }: PageProps) {
  const [dataset, resolvedSearchParams] = await Promise.all([getPubgHubDataset(), searchParams]);

  return <CompetitionLeaderboardsPage dataset={dataset} searchParams={resolvedSearchParams} basePath="/pubg/leaderboards" />;
}
