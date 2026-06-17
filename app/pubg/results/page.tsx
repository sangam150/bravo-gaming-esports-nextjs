import type { Metadata } from "next";
import { PubgResultsPage } from "@/components/pubg/PubgPublicPages";
import { getPubgHubDataset } from "@/lib/pubg-hub";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const metadata: Metadata = {
  title: "PUBG Results",
  description: "Browse Bravo PUBG match activity with winner, top fragger, event context, and approval state.",
};

export const revalidate = 300;

export default async function PubgResultsIndexPage({ searchParams }: PageProps) {
  const [dataset, resolvedSearchParams] = await Promise.all([getPubgHubDataset(), searchParams]);
  return <PubgResultsPage dataset={dataset} searchParams={resolvedSearchParams} />;
}
