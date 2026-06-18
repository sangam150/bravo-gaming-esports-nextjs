import type { Metadata } from "next";
import { PlatformMatchesPage } from "@/components/platform/PlatformPages";
import { getPlatformHubData } from "@/lib/platform-hub";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const metadata: Metadata = {
  title: "Matches",
  description: "Bravo match center for upcoming, live, completed, and planned matches across the platform.",
};

export const revalidate = 300;

export default async function MatchesPage({ searchParams }: PageProps) {
  const [hub, resolvedSearchParams] = await Promise.all([getPlatformHubData(), searchParams]);
  return <PlatformMatchesPage hub={hub} searchParams={resolvedSearchParams} />;
}
