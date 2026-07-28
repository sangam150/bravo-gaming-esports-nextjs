import { PlatformRankingsPage } from "@/components/platform/PlatformPages";
import { buildContentMetadata } from "@/lib/metadata";
import { getPlatformHubData } from "@/lib/platform-hub";
import { getPubgHubDataset } from "@/lib/pubg-hub";
import type { Metadata } from "next";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const metadata: Metadata = buildContentMetadata({
  title: "Rankings | Bravo Gaming Esports",
  description: "Browse published Bravo Gaming Esports team and player rankings.",
  path: "/rankings",
  type: "website",
});

export const revalidate = 300;

export default async function RankingsPage({ searchParams }: PageProps) {
  const [hub, pubg, resolvedSearchParams] = await Promise.all([getPlatformHubData(), getPubgHubDataset(), searchParams]);
  return <PlatformRankingsPage hub={hub} pubg={pubg} searchParams={resolvedSearchParams} />;
}
