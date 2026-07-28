import JsonLd from "@/components/JsonLd";
import { PubgEventDetailPage } from "@/components/pubg/PubgPublicPages";
import { buildContentMetadata } from "@/lib/metadata";
import { getPubgEventBySlug, getPubgHubDataset } from "@/lib/pubg-hub";
import { buildBreadcrumbStructuredData, buildPublicEventStructuredData } from "@/lib/structured-data";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

async function resolveEvent(slug: string) {
  try {
    return await getPubgEventBySlug(slug);
  } catch {
    return null;
  }
}

async function resolveEventDataset(slug: string) {
  try {
    const dataset = await getPubgHubDataset();
    const event = dataset.events.find((item) => item.slug === slug) ?? null;
    return { dataset, event };
  } catch {
    return { dataset: null, event: null };
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const event = await resolveEvent(slug);

  if (!event) {
    return { title: "PUBG Event Not Found" };
  }

  return buildContentMetadata({
    title: `${event.name} | Bravo Gaming Esports`,
    description: event.description || `View published event details, standings, and results for ${event.name}.`,
    path: `/pubg/events/${event.slug}`,
    imageUrl: event.bannerUrl,
    type: "website",
  });
}

export const revalidate = 300;

export default async function PubgEventDetailRoute({ params, searchParams }: PageProps) {
  const [{ slug }, resolvedSearchParams] = await Promise.all([params, searchParams]);
  const { dataset, event } = await resolveEventDataset(slug);

  if (!dataset || !event) {
    notFound();
  }

  return (
    <>
      <JsonLd
        data={buildPublicEventStructuredData({
          bannerUrl: event.bannerUrl,
          endDate: event.endDate,
          lifecycle: event.lifecycle,
          name: event.name,
          organizerName: "Bravo Gaming Esports",
          path: `/pubg/events/${event.slug}`,
          region: event.region,
          slug: event.slug,
          startDate: event.startDate,
          summary: event.description,
        })}
      />
      <JsonLd
        data={buildBreadcrumbStructuredData([
          { name: "Home", path: "/" },
          { name: "PUBG", path: "/pubg" },
          { name: "Events", path: "/pubg/events" },
          { name: event.name, path: `/pubg/events/${event.slug}` },
        ])}
      />
      <PubgEventDetailPage dataset={dataset} event={event} searchParams={resolvedSearchParams} />
    </>
  );
}
