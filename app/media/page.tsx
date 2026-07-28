import { MediaReferencePage } from "@/components/public/ContentReferencePages";
import { getPlatformHubData } from "@/lib/platform-hub";
import type { Metadata } from "next";

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
  return <MediaReferencePage hub={hub} searchParams={resolvedSearchParams} />;
}
