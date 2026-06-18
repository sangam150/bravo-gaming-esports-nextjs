import type { Metadata } from "next";
import { PlatformNewsPage } from "@/components/platform/PlatformPages";
import { getPlatformHubData } from "@/lib/platform-hub";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const metadata: Metadata = {
  title: "News",
  description: "Bravo Gaming Esports news hub for PUBG, Nepal esports, platform updates, and future multi-game editorial coverage.",
};

export const revalidate = 300;

export default async function NewsPage({ searchParams }: PageProps) {
  const [hub, resolvedSearchParams] = await Promise.all([getPlatformHubData(), searchParams]);
  return <PlatformNewsPage hub={hub} searchParams={resolvedSearchParams} />;
}
