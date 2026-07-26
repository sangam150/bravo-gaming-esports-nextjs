import { PubgCommunityPage } from "@/components/pubg/PubgPublicPages";
import { getPlatformHubData } from "@/lib/platform-hub";
import { getPubgHubDataset } from "@/lib/pubg-hub";
import type { Metadata } from "next";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const metadata: Metadata = {
  title: "PUBG Community",
  description: "Browse Bravo PUBG community teams, players, announcements, and direct routes into the active competitive ecosystem.",
};

export const revalidate = 300;

export default async function PubgCommunityIndexPage({ searchParams }: PageProps) {
  const [dataset, hub, resolvedSearchParams] = await Promise.all([getPubgHubDataset(), getPlatformHubData(), searchParams]);
  return <PubgCommunityPage dataset={dataset} hub={hub} searchParams={resolvedSearchParams} />;
}
