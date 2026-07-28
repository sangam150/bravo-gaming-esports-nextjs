import { MediaReferencePage } from "@/components/public/content/MediaReferencePage";
import { buildContentMetadata } from "@/lib/metadata";
import { getPlatformHubData } from "@/lib/platform-hub";
import type { Metadata } from "next";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const metadata: Metadata = buildContentMetadata({
  title: "Media | Bravo Gaming Esports",
  description: "Browse published Bravo Gaming Esports videos, highlights, clips, interviews, posters, and VODs.",
  path: "/media",
  type: "website",
});

export const revalidate = 300;

export default async function MediaPage({ searchParams }: PageProps) {
  const [hub, resolvedSearchParams] = await Promise.all([getPlatformHubData(), searchParams]);
  return <MediaReferencePage hub={hub} searchParams={resolvedSearchParams} />;
}
