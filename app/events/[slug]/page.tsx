import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PlatformEventDetailPage } from "@/components/platform/PlatformPages";
import { buildContentMetadata } from "@/lib/metadata";
import { getPlatformEventBySlug, getPlatformFallbackEventBySlug, getPlatformHubData } from "@/lib/platform-hub";
import { getPubgHubDataset } from "@/lib/pubg-hub";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const event = await getPlatformEventBySlug(slug);

  if (!event) {
    return { title: "Event Not Found" };
  }

  return buildContentMetadata({
    title: event.name,
    description: event.summary,
    path: `/events/${event.slug}`,
    imageUrl: event.bannerUrl,
  });
}

export const revalidate = 300;

export default async function EventDetailPage({ params }: PageProps) {
  const [{ slug }, hub, pubg] = await Promise.all([params, getPlatformHubData(), getPubgHubDataset()]);
  const event =
    hub.events.find((item) => item.slug === slug) ??
    hub.home.featuredEvents.find((item) => item.slug === slug) ??
    hub.home.upcomingEvents.find((item) => item.slug === slug) ??
    getPlatformFallbackEventBySlug(slug) ??
    null;

  if (!event) {
    notFound();
  }

  return <PlatformEventDetailPage hub={hub} event={event} pubg={event.gameSlug === "pubg-pc" ? pubg : null} />;
}
