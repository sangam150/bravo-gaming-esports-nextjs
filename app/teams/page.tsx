import { CompetitionTeamsPage } from "@/components/public/competition/CompetitionTeamsPage";
import { buildContentMetadata } from "@/lib/metadata";
import { getPubgHubDataset } from "@/lib/pubg-hub";
import type { Metadata } from "next";

export const metadata: Metadata = buildContentMetadata({
  title: "Teams | Bravo Gaming Esports",
  description: "Browse published Bravo Gaming Esports team profiles, active rosters, results, and PUBG PC competition statistics.",
  path: "/teams",
  type: "website",
});

export const revalidate = 300;

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function Page({ searchParams }: PageProps) {
  const [dataset, resolvedSearchParams] = await Promise.all([getPubgHubDataset(), searchParams]);
  return <CompetitionTeamsPage dataset={dataset} searchParams={resolvedSearchParams} basePath="/teams" />;
}
