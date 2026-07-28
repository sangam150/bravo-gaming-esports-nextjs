import { PubgCommunityPage } from "@/components/pubg/PubgPublicPages";
import { buildContentMetadata } from "@/lib/metadata";
import { getPlatformHubData } from "@/lib/platform-hub";
import { getPubgHubDataset } from "@/lib/pubg-hub";
import type { Metadata } from "next";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const metadata: Metadata = buildContentMetadata({
  title: "PUBG Community | Bravo Gaming Esports",
  description: "Browse published Bravo PUBG team, player, and community information.",
  path: "/pubg/community",
  type: "website",
});

export const revalidate = 300;

export default async function PubgCommunityIndexPage({ searchParams }: PageProps) {
  const [dataset, hub, resolvedSearchParams] = await Promise.all([getPubgHubDataset(), getPlatformHubData(), searchParams]);
  return <PubgCommunityPage dataset={dataset} hub={hub} searchParams={resolvedSearchParams} />;
}
