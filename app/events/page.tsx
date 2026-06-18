import type { Metadata } from "next";
import { PlatformEventsPage } from "@/components/platform/PlatformPages";
import { getPlatformHubData } from "@/lib/platform-hub";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const metadata: Metadata = {
  title: "Events",
  description: "Universal Bravo Gaming Esports event system for scrims, tournaments, leagues, seasons, and invitationals.",
};

export const revalidate = 300;

export default async function EventsPage({ searchParams }: PageProps) {
  const [hub, resolvedSearchParams] = await Promise.all([getPlatformHubData(), searchParams]);
  return <PlatformEventsPage hub={hub} searchParams={resolvedSearchParams} />;
}
