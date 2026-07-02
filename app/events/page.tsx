import type { Metadata } from "next";
import { PlatformEventsPage } from "@/components/platform/PlatformPages";
import { buildContentMetadata } from "@/lib/metadata";
import { getPlatformHubData } from "@/lib/platform-hub";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const metadata: Metadata = buildContentMetadata({
  title: "Events | Bravo Gaming Esports",
  description: "Browse Bravo Gaming Esports scrims, tournaments, leagues, seasons, and featured public event pages.",
  path: "/events",
  type: "website",
});

export const revalidate = 300;

export default async function EventsPage({ searchParams }: PageProps) {
  const [hub, resolvedSearchParams] = await Promise.all([getPlatformHubData(), searchParams]);
  return <PlatformEventsPage hub={hub} searchParams={resolvedSearchParams} />;
}
