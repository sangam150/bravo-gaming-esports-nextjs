import type { Metadata } from "next";
import { MediaCenterLandingPage } from "@/components/public/PublicLandingPages";
import { getPlatformHubData } from "@/lib/platform-hub";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const metadata: Metadata = {
  title: "Media",
  description: "Bravo Gaming Esports media center for videos, highlights, clips, interviews, posters, and VODs.",
};

export const revalidate = 300;

export default async function MediaPage({ searchParams }: PageProps) {
  const [hub, resolvedSearchParams] = await Promise.all([getPlatformHubData(), searchParams]);
  return <MediaCenterLandingPage hub={hub} searchParams={resolvedSearchParams} />;
}
