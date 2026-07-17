import type { Metadata } from "next";
import { NewsLandingPage } from "@/components/public/PublicLandingPages";
import { buildContentMetadata } from "@/lib/metadata";
import { getPlatformHubData } from "@/lib/platform-hub";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const metadata: Metadata = buildContentMetadata({
  title: "News",
  description:
    "Bravo Gaming Esports news hub for published stories, platform updates, Nepal esports coverage, and public match-adjacent editorial posts.",
  path: "/news",
  type: "website",
});

export const revalidate = 60;

export default async function NewsPage({ searchParams }: PageProps) {
  const [hub, resolvedSearchParams] = await Promise.all([getPlatformHubData(), searchParams]);
  return <NewsLandingPage hub={hub} searchParams={resolvedSearchParams} />;
}
