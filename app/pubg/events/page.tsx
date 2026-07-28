import { PubgEventsPage } from "@/components/pubg/PubgPublicPages";
import { buildContentMetadata } from "@/lib/metadata";
import { getPubgHubDataset } from "@/lib/pubg-hub";
import type { Metadata } from "next";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const metadata: Metadata = buildContentMetadata({
  title: "PUBG Events | Bravo Gaming Esports",
  description: "Browse published Bravo PUBG event schedules, standings, teams, matches, and results.",
  path: "/pubg/events",
  type: "website",
});

export const revalidate = 300;

export default async function PubgEventsIndexPage({ searchParams }: PageProps) {
  const [dataset, resolvedSearchParams] = await Promise.all([getPubgHubDataset(), searchParams]);
  return <PubgEventsPage dataset={dataset} searchParams={resolvedSearchParams} />;
}
