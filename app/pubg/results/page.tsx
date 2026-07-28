import { PubgResultsPage } from "@/components/pubg/PubgPublicPages";
import { buildContentMetadata } from "@/lib/metadata";
import { getPubgHubDataset } from "@/lib/pubg-hub";
import type { Metadata } from "next";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const metadata: Metadata = buildContentMetadata({
  title: "PUBG Results | Bravo Gaming Esports",
  description: "Browse published Bravo PUBG match results with winner, top fragger, standings, and event context.",
  path: "/pubg/results",
  type: "website",
});

export const revalidate = 300;

export default async function PubgResultsIndexPage({ searchParams }: PageProps) {
  const [dataset, resolvedSearchParams] = await Promise.all([getPubgHubDataset(), searchParams]);
  return <PubgResultsPage dataset={dataset} searchParams={resolvedSearchParams} />;
}
