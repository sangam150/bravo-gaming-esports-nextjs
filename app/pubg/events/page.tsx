import type { Metadata } from "next";
import { PubgEventsPage } from "@/components/pubg/PubgPublicPages";
import { getPubgHubDataset } from "@/lib/pubg-hub";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const metadata: Metadata = {
  title: "PUBG Events",
  description: "Browse Bravo PUBG events with schedules, standings, teams, matches, and full event context.",
};

export const revalidate = 300;

export default async function PubgEventsIndexPage({ searchParams }: PageProps) {
  const [dataset, resolvedSearchParams] = await Promise.all([getPubgHubDataset(), searchParams]);
  return <PubgEventsPage dataset={dataset} searchParams={resolvedSearchParams} />;
}
