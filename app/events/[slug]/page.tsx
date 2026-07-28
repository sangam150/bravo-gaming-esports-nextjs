import JsonLd from "@/components/JsonLd";
import { PlatformEventDetailPage } from "@/components/platform/PlatformPages";
import { buildContentMetadata } from "@/lib/metadata";
import { getPlatformEventBySlug, getPlatformHubData } from "@/lib/platform-hub";
import { getPubgHubDataset } from "@/lib/pubg-hub";
import { buildBreadcrumbStructuredData, buildPublicEventStructuredData } from "@/lib/structured-data";
import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";

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
    description: event.summary || `View published event details for ${event.name}.`,
    path: `/events/${event.slug}`,
    imageUrl: event.bannerUrl,
    canonicalUrl: event.gameSlug === "pubg-pc" ? `/pubg/events/${event.slug}` : undefined,
    type: "website",
  });
}

export const revalidate = 300;

export default async function EventDetailPage({ params }: PageProps) {
  const { slug } = await params;
  if (slug === "pubg-mahasangram-2-0") {
    permanentRedirect("/events/pubg-mahasangram-53821");
  }

  const [hub, pubg] = await Promise.all([getPlatformHubData(), getPubgHubDataset()]);
  const event =
    hub.events.find((item) => item.slug === slug) ??
    hub.home.featuredEvents.find((item) => item.slug === slug) ??
    hub.home.upcomingEvents.find((item) => item.slug === slug) ??
    null;

  if (!event) {
    notFound();
  }

  const canonicalPath = event.gameSlug === "pubg-pc" ? `/pubg/events/${event.slug}` : `/events/${event.slug}`;

  return (
    <>
      <JsonLd
        data={buildPublicEventStructuredData({
          bannerUrl: event.bannerUrl,
          endDate: event.endDate,
          lifecycle: event.lifecycle,
          name: event.name,
          organizerName: event.organizerName,
          path: canonicalPath,
          region: event.region,
          slug: event.slug,
          startDate: event.startDate,
          summary: event.summary,
        })}
      />
      <JsonLd
        data={buildBreadcrumbStructuredData([
          { name: "Home", path: "/" },
          { name: "Events", path: "/events" },
          { name: event.name, path: canonicalPath },
        ])}
      />
      <PlatformEventDetailPage hub={hub} event={event} pubg={event.gameSlug === "pubg-pc" ? pubg : null} />
    </>
  );
}
